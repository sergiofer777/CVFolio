import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  parseCVWithAI,
  parseCVImageWithAI,
  extractTextFromCVImageWithAI,
  generateLandingWithAI,
} from "@/lib/ai/parse-cv";
import type { CVData, ParseCVResponse } from "@/types/cv-data";
import { getPlanLimits, type ProfilePlan } from "@/lib/billing/access";
import { consumeUsage } from "@/lib/billing/quotas";
import { isBillingEnforcementEnabled } from "@/lib/billing/config";
import {
  DEFAULT_PORTFOLIO_THEME,
  isPortfolioTheme,
} from "@/lib/templates/portfolio-themes";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/locale";

// Extrae texto de PDF usando pdf-parse
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

export async function POST(request: NextRequest): Promise<NextResponse<ParseCVResponse>> {
  try {
    const isEn =
      normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value) === "en";
    // 1. Verificar autenticación
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: isEn ? "Unauthorized" : "No autorizado",
        },
        { status: 401 }
      );
    }

    // 2. Obtener el archivo del FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const templateIdInput = formData.get("templateId");
    const selectedTemplateId =
      typeof templateIdInput === "string" && isPortfolioTheme(templateIdInput)
        ? templateIdInput
        : DEFAULT_PORTFOLIO_THEME;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: isEn ? "No file was received." : "No se recibió ningún archivo",
        },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: isEn
            ? "The file exceeds the 10MB limit."
            : "El archivo supera el límite de 10MB",
        },
        { status: 400 }
      );
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: isEn
            ? "Unsupported format. Use PDF, JPG or PNG."
            : "Formato no soportado. Usa PDF, JPG o PNG",
        },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data: profileRaw } = await adminClient
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    const plan =
      ((profileRaw as { plan?: ProfilePlan } | null)?.plan ?? "free") as ProfilePlan;

    const billingEnforced = isBillingEnforcementEnabled();
    if (billingEnforced) {
      const usageResult = await consumeUsage({
        admin: adminClient,
        userId: user.id,
        plan,
        metric: "generation",
      });

      if (usageResult.storageReady === false) {
        const fallbackLimit = getPlanLimits(plan).generationLimit;
        if (fallbackLimit !== null) {
          const { count } = await adminClient
            .from("portfolios")
            .select("id", { head: true, count: "exact" })
            .eq("user_id", user.id);

          if ((count ?? 0) >= fallbackLimit) {
            return NextResponse.json(
              {
                success: false,
                error:
                  plan === "studio"
                    ? isEn
                      ? "You have reached the maximum of 3 portfolios for Studio."
                      : "Has alcanzado el máximo de 3 portfolios para Studio."
                    : isEn
                      ? "You have reached the portfolio limit for your plan."
                      : "Has alcanzado el límite de portfolios para tu plan.",
              },
              { status: 402 }
            );
          }
        }
      }

      if (!usageResult.allowed) {
        const limit = usageResult.generationLimit ?? 0;
        const used = usageResult.generationUsed;
        const message =
          plan === "studio"
            ? isEn
              ? `You have reached your monthly limit of ${limit} generations (${used}/${limit}).`
              : `Has alcanzado tu límite mensual de ${limit} generaciones (${used}/${limit}).`
            : isEn
              ? "Your free trial has already been used. Activate the €9.99 plan to publish and keep your site."
              : "Tu prueba gratuita ya se consumió. Activa el plan de €9,99 para publicar y conservar tu web.";

        return NextResponse.json(
          {
            success: false,
            error: message,
          },
          { status: 402 }
        );
      }
    }

    // 3. Subir el archivo a Supabase Storage
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
        {
          success: false,
          error: isEn
            ? "There was an error uploading the file."
            : "Error al subir el archivo",
        },
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
            error: isEn
              ? "Text could not be extracted from the PDF. Try an image instead."
              : "No se pudo extraer texto del PDF. Prueba con una imagen.",
          },
          { status: 422 }
        );
      }
      cvData = await parseCVWithAI(text);
      cvTextForLanding = JSON.stringify(
        {
          structuredCv: cvData,
          rawCvText: text,
        },
        null,
        2
      );
    } else {
      const base64 = buffer.toString("base64");
      const mediaType = file.type as "image/jpeg" | "image/png";
      cvData = await parseCVImageWithAI(base64, mediaType);
      let rawImageText = "";

      try {
        rawImageText = await extractTextFromCVImageWithAI(base64, mediaType);
      } catch (ocrError) {
        console.error("image ocr error:", ocrError);
      }

      cvTextForLanding = JSON.stringify(
        {
          structuredCv: cvData,
          rawCvText: rawImageText || undefined,
        },
        null,
        2
      );
    }

    // 5.1 Generar landing one-page con prompt estrategico (si falla, no rompe el flujo)
    try {
      const generatedLanding = await generateLandingWithAI(
        cvTextForLanding,
        selectedTemplateId
      );
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

    // 7. Guardar el portafolio como una nueva creación
    const { data: newPortfolio, error: portfolioError } = await adminClient
      .from("portfolios")
      .insert({
        user_id: user.id,
        upload_id: uploadRecord?.id ?? null,
        cv_data: cvData as never,
        theme: selectedTemplateId,
        is_published: false,
        is_public: false,
        published_at: null,
      })
      .select()
      .single();

    if (portfolioError || !newPortfolio) {
      return NextResponse.json(
        {
          success: false,
          error: isEn
            ? "There was an error saving the portfolio."
            : "Error al guardar el portafolio",
        },
        { status: 500 }
      );
    }
    const portfolioId = newPortfolio.id;

    return NextResponse.json({
      success: true,
      data: cvData,
      portfolioId,
    });
  } catch (error) {
    console.error("parse-cv error:", error);
    const isEn =
      normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value) === "en";
    const message =
      error instanceof SyntaxError
        ? isEn
          ? "The AI did not return valid JSON. Please try again."
          : "La IA no devolvió un JSON válido. Intenta de nuevo."
        : isEn
          ? "Internal server error"
          : "Error interno del servidor";

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
