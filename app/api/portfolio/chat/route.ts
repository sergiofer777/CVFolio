import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { CVData, PortfolioTheme } from "@/types/cv-data";
import type { ProfilePlan } from "@/lib/billing/access";
import { getPlanLimits } from "@/lib/billing/access";
import { consumeUsage } from "@/lib/billing/quotas";
import { isBillingEnforcementEnabled } from "@/lib/billing/config";

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

SOLICITUD DEL USUARIO:
${params.userMessage}

CONTEXTO CV:
${JSON.stringify(params.cvData, null, 2)}

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
    throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const html = extractHtmlFromText(text);
  if (!html) {
    throw new Error("La IA no devolvió HTML utilizable para la iteración.");
  }
  return html;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
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
        { error: "No se encontró ese portfolio en tu cuenta." },
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
        { error: "Tu plan actual no incluye iteraciones con IA. Activa Studio." },
        { status: 402 }
      );
    }

    if (perPortfolioLimit !== null && iterationsUsed >= perPortfolioLimit) {
      return NextResponse.json(
        { error: `Límite de ${perPortfolioLimit} iteraciones para este portfolio.` },
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
          { error: usage.reason ?? "Límite de iteraciones alcanzado." },
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
            "Este portfolio no tiene HTML generado para iterar por chat todavía.",
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
      message: "Cambios aplicados al portfolio.",
      iterationsUsed: iterationsUsed + 1,
      iterationsLimit: perPortfolioLimit,
      billingEnforced,
    });
  } catch (error) {
    console.error("[portfolio/chat] error:", error);
    return NextResponse.json(
      { error: "No se pudo aplicar la iteración de chat al portfolio." },
      { status: 500 }
    );
  }
}
