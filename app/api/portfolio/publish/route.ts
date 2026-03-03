import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isPaidPlan, type ProfilePlan } from "@/lib/billing/access";
import { buildPublicPortfolioUrl, publishSelectedPortfolio } from "@/lib/billing/activation";
import { upsertCloudflareSubdomainRecord } from "@/lib/cloudflare/dns";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/locale";

const schema = z.object({
  portfolioId: z.string().uuid().optional(),
});

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
    const { data: profileRaw } = await admin
      .from("profiles")
      .select("username, plan")
      .eq("id", user.id)
      .maybeSingle();
    const profile =
      (profileRaw as { username?: string; plan?: ProfilePlan } | null) ?? null;
    const username = profile?.username?.trim().toLowerCase();
    const plan = (profile?.plan ?? "free") as ProfilePlan;

    if (!isPaidPlan(plan)) {
      return NextResponse.json(
        {
          error: isEn
            ? "You need to activate a plan to publish on a subdomain."
            : "Necesitas activar un plan para publicar en subdominio.",
          billingUrl: `/dashboard/billing${
            parsed.data.portfolioId ? `?portfolioId=${parsed.data.portfolioId}` : ""
          }`,
        },
        { status: 402 }
      );
    }

    const publishedPortfolioId = await publishSelectedPortfolio({
      admin,
      userId: user.id,
      portfolioId: parsed.data.portfolioId ?? null,
    });

    if (!publishedPortfolioId) {
      return NextResponse.json(
        {
          error: isEn
            ? "No website was found to publish."
            : "No se encontró una web para publicar.",
        },
        { status: 404 }
      );
    }

    if (username) {
      try {
        await upsertCloudflareSubdomainRecord(username);
      } catch (error) {
        console.error("[portfolio/publish] subdomain provision error:", error);
      }
    }

    const subdomainUrl = username ? buildPublicPortfolioUrl(username) : null;
    const fallbackUrl = username ? `/p/${username}` : `/dashboard`;
    const publicUrl = subdomainUrl ?? fallbackUrl;

    return NextResponse.json({
      ok: true,
      publicUrl,
      subdomainUrl,
      publishedPortfolioId,
      fallbackUrl,
    });
  } catch (error) {
    console.error("[portfolio/publish] error:", error);
    const isEn =
      normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value) === "en";
    return NextResponse.json(
      {
        error: isEn
          ? "This website could not be published."
          : "No se pudo publicar esta web.",
      },
      { status: 500 }
    );
  }
}
