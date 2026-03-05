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

type AcceptedUploadType = "pdf" | "jpg" | "png";

const MIME_BY_UPLOAD_TYPE: Record<AcceptedUploadType, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
};

// Extrae texto de PDF usando pdf-parse
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

function detectUploadTypeFromSignature(buffer: Buffer): AcceptedUploadType | null {
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "pdf";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  return null;
}

function buildHttpError(message: string, status: number): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

function sanitizeStoredFileName(fileName: string): string {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const cleaned = normalized
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!cleaned) return `upload_${Date.now()}`;
  return cleaned.slice(0, 120);
}

function hasMeaningfulCvData(cvData: CVData): boolean {
  const personal = cvData.personal ?? ({} as CVData["personal"]);
  const summaryLength = personal.summary?.trim().length ?? 0;
  const hasIdentity = Boolean(personal.name?.trim()) || Boolean(personal.title?.trim());

  const hasExperience = (cvData.experience ?? []).some(
    (item) =>
      Boolean(item.company?.trim()) ||
      Boolean(item.role?.trim()) ||
      (item.description ?? []).some((line) => Boolean(line?.trim()))
  );
  const hasEducation = (cvData.education ?? []).some(
    (item) =>
      Boolean(item.institution?.trim()) ||
      Boolean(item.degree?.trim()) ||
      Boolean(item.field?.trim())
  );
  const hasProjects = (cvData.projects ?? []).some(
    (item) => Boolean(item.name?.trim()) || Boolean(item.description?.trim())
  );
  const hasSkills = [
    ...(cvData.skills?.technical ?? []),
    ...(cvData.skills?.soft ?? []),
    ...((cvData.skills?.languages ?? []).map((item) => item.language)),
  ].some((skill) => Boolean(skill?.trim()));
  const hasCertifications = (cvData.certifications ?? []).some(
    (cert) => Boolean(cert.name?.trim()) || Boolean(cert.issuer?.trim())
  );

  const dataSignals = [
    hasIdentity,
    hasExperience,
    hasEducation,
    hasProjects,
    hasSkills,
    hasCertifications,
    summaryLength >= 80,
  ].filter(Boolean).length;

  return dataSignals >= 2;
}

function hasMeaningfulGeneratedHtml(html?: string): boolean {
  if (!html) return false;
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return visibleText.length >= 180;
}

function normalizeTextForSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasCvAnchorsInGeneratedHtml(html: string, cvData: CVData): boolean {
  const visibleText = normalizeTextForSearch(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
  if (!visibleText) return false;

  const personalCandidates = [
    cvData.personal?.name,
    cvData.personal?.title,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => normalizeTextForSearch(value))
    .filter((value) => value.length >= 3);

  const professionalCandidates = [
    cvData.experience?.[0]?.company,
    cvData.experience?.[0]?.role,
    cvData.education?.[0]?.institution,
    cvData.projects?.[0]?.name,
    cvData.skills?.technical?.[0],
    cvData.skills?.technical?.[1],
    cvData.skills?.languages?.[0]?.language,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => normalizeTextForSearch(value))
    .filter((value) => value.length >= 3);

  const matchesCandidate = (candidate: string): boolean => {
    if (visibleText.includes(candidate)) return true;
    const terms = candidate.split(" ").filter((term) => term.length >= 4);
    return terms.some((term) => visibleText.includes(term));
  };

  if (professionalCandidates.length > 0) {
    return professionalCandidates.some(matchesCandidate);
  }

  if (personalCandidates.length > 0) {
    return personalCandidates.some(matchesCandidate);
  }

  return false;
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

    // 2. Obtener archivo (modo binario preferente o multipart fallback)
    const uploadMode = request.headers.get("x-upload-mode");
    let selectedTemplateId = DEFAULT_PORTFOLIO_THEME;
    let originalFileName = "cv-upload";
    let declaredMimeType = "application/octet-stream";
    let fileSize = 0;
    let buffer: Buffer;

    if (uploadMode === "binary") {
      const templateIdHeader = request.headers.get("x-template-id");
      if (templateIdHeader && isPortfolioTheme(templateIdHeader)) {
        selectedTemplateId = templateIdHeader;
      }

      const uploadFileNameHeader = request.headers.get("x-upload-filename");
      if (uploadFileNameHeader && uploadFileNameHeader.trim().length > 0) {
        originalFileName = sanitizeStoredFileName(uploadFileNameHeader.trim());
      }

      const contentTypeHeader = request.headers.get("content-type");
      declaredMimeType =
        contentTypeHeader?.split(";")[0]?.trim().toLowerCase() ??
        "application/octet-stream";

      buffer = Buffer.from(await request.arrayBuffer());
      fileSize = buffer.length;
    } else {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const originalFileNameInput = formData.get("originalFileName");
      const incomingOriginalFileName =
        typeof originalFileNameInput === "string" &&
        originalFileNameInput.trim().length > 0
          ? originalFileNameInput.trim()
          : file?.name ?? "cv-upload";
      originalFileName = sanitizeStoredFileName(incomingOriginalFileName);
      const templateIdInput = formData.get("templateId");
      selectedTemplateId =
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

      declaredMimeType = (file.type ?? "application/octet-stream")
        .split(";")[0]
        .trim()
        .toLowerCase();
      fileSize = file.size;
      buffer = Buffer.from(await file.arrayBuffer());
    }

    if (fileSize <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: isEn ? "No file was received." : "No se recibió ningún archivo",
        },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
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
    if (
      declaredMimeType !== "application/octet-stream" &&
      !allowedTypes.includes(declaredMimeType)
    ) {
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

    const detectedType = detectUploadTypeFromSignature(buffer);
    if (!detectedType) {
      return NextResponse.json(
        {
          success: false,
          error: isEn
            ? "Unsupported file signature. Use a valid PDF, JPG or PNG."
            : "Firma de archivo no válida. Usa un PDF, JPG o PNG real.",
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
                      ? "You have reached the maximum of 3 websites for Studio."
                      : "Has alcanzado el máximo de 3 webs para Studio."
                    : isEn
                      ? "You have reached the website limit for your plan."
                      : "Has alcanzado el límite de webs para tu plan.",
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
              ? "Your free trial has already been used. Activate the 9.99 € plan to publish and keep your site."
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
    const fileExtension = detectedType;
    const filePath = `${user.id}/${Date.now()}.${fileExtension}`;
    let uploadRecordId: string | null = null;

    const { error: uploadError } = await adminClient.storage
      .from("cv-uploads")
      .upload(filePath, buffer, {
        contentType: MIME_BY_UPLOAD_TYPE[detectedType],
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
        file_name: originalFileName,
        file_path: filePath,
        file_type: fileType,
        file_size: fileSize,
        status: "processing",
      })
      .select()
      .single();

    if (dbUploadError) {
      console.error("DB insert error:", dbUploadError);
    }
    uploadRecordId = (uploadRecord as { id?: string } | null)?.id ?? null;

    try {
      // 5. Extraer texto / enviar imagen a la IA
      let cvData: CVData;
      let cvTextForLanding = "";

      if (detectedType === "pdf") {
        const text = await extractTextFromPDF(buffer);
        if (!text || text.trim().length < 50) {
          throw buildHttpError(
            isEn
              ? "Text could not be extracted from the PDF. Try an image instead."
              : "No se pudo extraer texto del PDF. Prueba con una imagen.",
            422
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
        const mediaType =
          detectedType === "png" ? "image/png" : "image/jpeg";
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

      if (!hasMeaningfulCvData(cvData)) {
        throw buildHttpError(
          isEn
            ? "We could not extract useful content from the CV."
            : "No se pudo extraer contenido útil del CV.",
          422
        );
      }

      // 5.1 Generar landing one-page con prompt estrategico (si falla, no rompe el flujo)
      try {
        const generatedLanding = await generateLandingWithAI(
          cvTextForLanding,
          selectedTemplateId
        );
        if (
          hasMeaningfulGeneratedHtml(generatedLanding.html) &&
          hasCvAnchorsInGeneratedHtml(generatedLanding.html ?? "", cvData)
        ) {
          cvData.generatedLanding = generatedLanding;
        } else {
          console.warn("landing generation returned low-content HTML, falling back to structured rendering");
        }
      } catch (landingError) {
        console.error("landing generation error:", landingError);
      }

      // 6. Actualizar status del upload
      if (uploadRecordId) {
        await adminClient
          .from("cv_uploads")
          .update({ status: "done" })
          .eq("id", uploadRecordId);
      }

      // 7. Guardar el portfolio como una nueva creación
      const { data: newPortfolio, error: portfolioError } = await adminClient
        .from("portfolios")
        .insert({
          user_id: user.id,
          upload_id: uploadRecordId,
          cv_data: cvData as never,
          theme: selectedTemplateId,
          is_published: false,
          is_public: false,
          published_at: null,
        })
        .select()
        .single();

      if (portfolioError || !newPortfolio) {
        throw buildHttpError(
          isEn
            ? "There was an error saving the website."
            : "Error al guardar la web",
          500
        );
      }
      const portfolioId = newPortfolio.id;

      return NextResponse.json({
        success: true,
        data: cvData,
        portfolioId,
      });
    } catch (processingError) {
      if (uploadRecordId) {
        await adminClient
          .from("cv_uploads")
          .update({ status: "error" })
          .eq("id", uploadRecordId)
          .eq("user_id", user.id);

        await adminClient
          .from("cv_uploads")
          .delete()
          .eq("id", uploadRecordId)
          .eq("user_id", user.id);
      }

      await adminClient.storage.from("cv-uploads").remove([filePath]);
      throw processingError;
    }
  } catch (error) {
    console.error("parse-cv error:", error);
    const isEn =
      normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value) === "en";
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status) || 500
        : 500;
    if (status !== 500) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : isEn
            ? "Could not process the file."
            : "No se pudo procesar el archivo.";
      return NextResponse.json({ success: false, error: errorMessage }, { status });
    }

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
