import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isPaidPlan, resolvePlan, type ProfilePlan } from "@/lib/billing/access";
import { buildRenderableGeneratedHtml } from "@/lib/portfolio/generated-html";
import type { CVData } from "@/types/cv-data";

export const runtime = "nodejs";

const querySchema = z.object({
  portfolioId: z.string().uuid(),
});

function slugifyFileName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const parsed = querySchema.safeParse({
      portfolioId: request.nextUrl.searchParams.get("portfolioId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Identificador de web inválido", details: parsed.error.flatten() },
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

    const plan = resolvePlan((profileRaw as { plan?: ProfilePlan } | null)?.plan);
    if (!isPaidPlan(plan)) {
      return NextResponse.json(
        { error: "Necesitas un plan de pago para descargar el HTML." },
        { status: 402 }
      );
    }

    const { data: portfolioRaw, error: portfolioError } = await admin
      .from("portfolios")
      .select("cv_data")
      .eq("id", parsed.data.portfolioId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (portfolioError) throw portfolioError;

    const portfolio = (portfolioRaw as { cv_data?: CVData } | null) ?? null;
    if (!portfolio?.cv_data) {
      return NextResponse.json(
        { error: "No se encontró esa web en tu cuenta." },
        { status: 404 }
      );
    }

    const html = buildRenderableGeneratedHtml(portfolio.cv_data);
    if (!html) {
      return NextResponse.json(
        { error: "Esta web aún no tiene HTML generado para descargar." },
        { status: 404 }
      );
    }

    const name = portfolio.cv_data.personal?.name?.trim() || "webiculum-web";
    const filename = `${slugifyFileName(name) || "webiculum-web"}.html`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[portfolio/download-html] error:", error);
    return NextResponse.json(
      { error: "No se pudo descargar el HTML de la web." },
      { status: 500 }
    );
  }
}
