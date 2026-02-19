import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  parseCVWithAI,
  parseCVImageWithAI,
  generateLandingWithAI,
} from "@/lib/ai/parse-cv";
import type { CVData, ParseCVResponse } from "@/types/cv-data";

// Extrae texto de PDF usando pdf-parse
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

export async function POST(request: NextRequest): Promise<NextResponse<ParseCVResponse>> {
  try {
    // 1. Verificar autenticación
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    // 2. Obtener el archivo del FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "El archivo supera el límite de 10MB" },
        { status: 400 }
      );
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Formato no soportado. Usa PDF, JPG o PNG" },
        { status: 400 }
      );
    }

    // 3. Subir el archivo a Supabase Storage
    const adminClient = createAdminClient();
    const fileExtension = file.name.split(".").pop() ?? "pdf";
    const filePath = `${user.id}/${Date.now()}.${fileExtension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("cv-uploads")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Error al subir el archivo" },
        { status: 500 }
      );
    }

    // 4. Registrar el upload en la base de datos
    const fileType = fileExtension as "pdf" | "jpg" | "png" | "jpeg";
    const { data: uploadRecord, error: dbUploadError } = await adminClient
      .from("cv_uploads")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: fileType,
        file_size: file.size,
        status: "processing",
      })
      .select()
      .single();

    if (dbUploadError) {
      console.error("DB insert error:", dbUploadError);
    }

    // 5. Extraer texto / enviar imagen a la IA
    let cvData: CVData;
    let cvTextForLanding = "";

    if (file.type === "application/pdf") {
      const text = await extractTextFromPDF(buffer);
      if (!text || text.trim().length < 50) {
        return NextResponse.json(
          {
            success: false,
            error: "No se pudo extraer texto del PDF. Prueba con una imagen.",
          },
          { status: 422 }
        );
      }
      cvTextForLanding = text;
      cvData = await parseCVWithAI(text);
    } else {
      const base64 = buffer.toString("base64");
      const mediaType = file.type as "image/jpeg" | "image/png";
      cvData = await parseCVImageWithAI(base64, mediaType);
      cvTextForLanding = JSON.stringify(cvData, null, 2);
    }

    // 5.1 Generar landing one-page con prompt estrategico (si falla, no rompe el flujo)
    try {
      const generatedLanding = await generateLandingWithAI(cvTextForLanding);
      cvData.generatedLanding = generatedLanding;
    } catch (landingError) {
      console.error("landing generation error:", landingError);
    }

    // 6. Actualizar status del upload
    if (uploadRecord) {
      await adminClient
        .from("cv_uploads")
        .update({ status: "done" })
        .eq("id", uploadRecord.id);
    }

    // 7. Guardar/actualizar el portafolio en la base de datos
    const { data: existingPortfolio } = await adminClient
      .from("portfolios")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let portfolioId: string;

    if (existingPortfolio) {
      // Actualiza el portafolio existente
      const { data: updated } = await adminClient
        .from("portfolios")
        .update({
          cv_data: cvData as never,
          upload_id: uploadRecord?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPortfolio.id)
        .select()
        .single();

      portfolioId = updated?.id ?? existingPortfolio.id;
    } else {
      // Crea un portafolio nuevo
      const { data: newPortfolio, error: portfolioError } = await adminClient
        .from("portfolios")
        .insert({
          user_id: user.id,
          upload_id: uploadRecord?.id ?? null,
          cv_data: cvData as never,
          theme: "minimal",
          is_published: false,
          is_public: true,
        })
        .select()
        .single();

      if (portfolioError || !newPortfolio) {
        return NextResponse.json(
          { success: false, error: "Error al guardar el portafolio" },
          { status: 500 }
        );
      }
      portfolioId = newPortfolio.id;
    }

    return NextResponse.json({
      success: true,
      data: cvData,
      portfolioId,
    });
  } catch (error) {
    console.error("parse-cv error:", error);
    const message =
      error instanceof SyntaxError
        ? "La IA no devolvió un JSON válido. Intenta de nuevo."
        : "Error interno del servidor";

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
