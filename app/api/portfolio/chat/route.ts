import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { CVData, PortfolioTheme } from "@/types/cv-data";
import type { ProfilePlan } from "@/lib/billing/access";
import { getPlanLimits } from "@/lib/billing/access";
import { consumeUsage } from "@/lib/billing/quotas";
import { isBillingEnforcementEnabled } from "@/lib/billing/config";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/locale";

const MODEL = "gemini-2.5-pro";

const schema = z.object({
  portfolioId: z.string().uuid(),
  message: z.string().min(6).max(200),
});

function extractHtmlFromText(input: string): string | undefined {
  const fenced = input.match(/```html\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const doctype = input.match(/<!doctype html[\s\S]*?<\/html>/gi);
  if (doctype?.length) return doctype[doctype.length - 1].trim();

  const html = input.match(/<html[\s\S]*?<\/html>/gi);
  if (html?.length) return html[html.length - 1].trim();

  return undefined;
}

function getCurrentHtml(cvData: CVData): string | undefined {
  if (cvData.generatedLanding?.html) return cvData.generatedLanding.html;
  if (cvData.generatedLanding?.markdown) {
    return extractHtmlFromText(cvData.generatedLanding.markdown);
  }
  return undefined;
}

function buildCvIterationContext(cvData: CVData): string {
  const { generatedLanding: _generatedLanding, ...structuredCv } = cvData;
  return JSON.stringify(structuredCv);
}

function inferCvLanguage(cvData: CVData): "es" | "en" {
  const sample = [
    cvData.personal?.title,
    cvData.personal?.summary,
    cvData.experience?.[0]?.role,
    cvData.experience?.[0]?.description?.[0],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!sample) return "es";

  const spanishHits = (sample.match(/\b(el|la|los|las|de|para|con|experiencia|gestion|gestión|desarrollo|equipo)\b/g) ?? []).length;
  const englishHits = (sample.match(/\b(the|and|with|for|experience|management|development|team)\b/g) ?? []).length;

  return englishHits > spanishHits ? "en" : "es";
}

async function recoverIterationHtml(params: {
  previousOutput: string;
  currentHtml: string;
  userMessage: string;
  targetLanguage: "es" | "en";
}): Promise<string | undefined> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text:
              "Eres un desarrollador frontend senior. Convierte la salida anterior en un único documento HTML final, limpio y utilizable. Devuelve solo HTML completo.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `La iteración anterior no ha devuelto HTML utilizable. Corrígela.

REGLAS:
1. Devuelve solo un documento HTML completo.
2. Debe empezar con <!doctype html> y terminar con </html>.
3. Mantén el estilo y la estructura base de la web actual.
4. Respeta la solicitud del usuario.
5. Mantén el idioma principal en ${params.targetLanguage === "en" ? "ingles" : "espanol"}.
6. El footer debe conservar la firma ${params.targetLanguage === "en" ? '"Built with Webiculum.com"' : '"Creado con Webiculum.com"'}.
7. Si existe toggle de idioma, deja el estado visible inicial en ${params.targetLanguage}.

SOLICITUD DEL USUARIO:
${params.userMessage}

HTML ACTUAL:
${params.currentHtml}

SALIDA ANTERIOR:
${params.previousOutput}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 16384,
      },
    }),
  });

  if (!response.ok) {
    const rawError = await response.text();
    const compactError = rawError.replace(/\s+/g, " ").trim().slice(0, 280);
    throw new Error(`Gemini recovery error ${response.status}: ${compactError}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return extractHtmlFromText(text);
}

async function rewriteLandingHtml(params: {
  currentHtml: string;
  cvData: CVData;
  userMessage: string;
  theme: PortfolioTheme | null;
}): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const targetLanguage = inferCvLanguage(params.cvData);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text:
              "Eres un desarrollador frontend senior. Recibes un HTML de landing existente y una petición de cambios. Devuelve solo el HTML final completo, sin markdown ni explicaciones.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `TAREA:
Aplica los cambios solicitados al HTML manteniendo el estilo original.

REGLAS:
1. Devuelve solo un documento HTML completo.
2. Debe empezar con <!doctype html> y terminar con </html>.
3. No rompas clases, scripts ni estructura base de la plantilla.
4. Cambia solo lo necesario para cumplir la solicitud.
5. Si piden datos no presentes, no inventes.
6. Mantén el idioma principal de la web en ${targetLanguage === "en" ? "ingles" : "espanol"}.
7. Conserva el footer con la firma ${targetLanguage === "en" ? '"Built with Webiculum.com"' : '"Creado con Webiculum.com"'}.
8. Si la plantilla tiene toggle de idioma, el estado visible por defecto debe seguir arrancando en ${targetLanguage}.

SOLICITUD DEL USUARIO:
${params.userMessage}

CONTEXTO CV COMPLETO:
${buildCvIterationContext(params.cvData)}

TEMA:
${params.theme ?? "minimal"}

HTML ACTUAL:
${params.currentHtml}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 16384,
      },
    }),
  });

  if (!response.ok) {
    const rawError = await response.text();
    const compactError = rawError.replace(/\s+/g, " ").trim().slice(0, 280);
    throw new Error(`Gemini API error ${response.status}: ${compactError}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const html =
    extractHtmlFromText(text) ??
    (await recoverIterationHtml({
      previousOutput: text,
      currentHtml: params.currentHtml,
      userMessage: params.userMessage,
      targetLanguage,
    }));
  if (!html) {
    throw new Error("La IA no devolvió HTML utilizable para la iteración.");
  }
  return html;
}

export async function POST(request: NextRequest) {
  try {
    const isEn =
      normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value) === "en";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: isEn ? "Unauthorized" : "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: isEn ? "Invalid payload" : "Payload inválido",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: profileRaw, error: profileError } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    const plan =
      ((profileRaw as { plan?: ProfilePlan } | null)?.plan ?? "free") as ProfilePlan;

    const { data: portfolioRaw, error: portfolioError } = await admin
      .from("portfolios")
      .select("id, user_id, cv_data, theme, version")
      .eq("id", parsed.data.portfolioId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (portfolioError) throw portfolioError;

    const portfolio =
      (portfolioRaw as {
        id: string;
        user_id: string;
        cv_data: CVData;
        theme: PortfolioTheme | null;
        version?: number | null;
      } | null) ?? null;

    if (!portfolio) {
      return NextResponse.json(
        {
          error: isEn
            ? "That website was not found in your account."
            : "No se encontró esa web en tu cuenta.",
        },
        { status: 404 }
      );
    }

    const billingEnforced = isBillingEnforcementEnabled();
    const planLimits = getPlanLimits(plan);
    const version = Math.max(1, portfolio.version ?? 1);
    const iterationsUsed = Math.max(0, version - 1);
    const perPortfolioLimit = planLimits.chatIterationLimitPerPortfolio ?? null;

    if (perPortfolioLimit === 0) {
      return NextResponse.json(
        {
          error: isEn
            ? "Your current plan does not include AI iterations. Activate Studio."
            : "Tu plan actual no incluye iteraciones con IA. Activa Studio.",
        },
        { status: 402 }
      );
    }

    if (perPortfolioLimit !== null && iterationsUsed >= perPortfolioLimit) {
      return NextResponse.json(
        {
          error: isEn
            ? `Limit of ${perPortfolioLimit} iterations for this website.`
            : `Límite de ${perPortfolioLimit} iteraciones para esta web.`,
        },
        { status: 402 }
      );
    }

    if (billingEnforced) {
      const usage = await consumeUsage({
        admin,
        userId: user.id,
        plan,
        metric: "chat_iteration",
      });
      if (!usage.allowed) {
        return NextResponse.json(
          {
            error: isEn
              ? "Iteration limit reached."
              : usage.reason ?? "Límite de iteraciones alcanzado.",
          },
          { status: 402 }
        );
      }
    }

    const cvData = portfolio.cv_data;
    const currentHtml = getCurrentHtml(cvData);
    if (!currentHtml) {
      return NextResponse.json(
        {
          error:
            isEn
              ? "This website does not have generated HTML for chat iterations yet."
              : "Esta web no tiene HTML generado para iterar por chat todavía.",
        },
        { status: 422 }
      );
    }

    const nextHtml = await rewriteLandingHtml({
      currentHtml,
      cvData,
      userMessage: parsed.data.message,
      theme: portfolio.theme,
    });

    const nextCvData: CVData = {
      ...cvData,
      generatedLanding: {
        ...(cvData.generatedLanding ?? {
          markdown: "",
          generatedAt: new Date().toISOString(),
          model: MODEL,
          templateId: portfolio.theme ?? "minimal",
        }),
        html: nextHtml,
        generatedAt: new Date().toISOString(),
        model: MODEL,
      },
    };

    const nextVersion = version + 1;
    const { error: updateError } = await admin
      .from("portfolios")
      .update({
        cv_data: nextCvData as never,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", portfolio.id)
      .eq("user_id", user.id);
    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      message: isEn
        ? "Changes applied to the website."
        : "Cambios aplicados a la web.",
      iterationsUsed: iterationsUsed + 1,
      iterationsLimit: perPortfolioLimit,
      billingEnforced,
    });
  } catch (error) {
    console.error("[portfolio/chat] error:", error);
    const isEn =
      normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value) === "en";
    const message = isEn
      ? "The chat iteration could not be applied to the website."
      : "No se pudo aplicar la iteración de chat a la web.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
