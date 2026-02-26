import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isPaidPlan, type ProfilePlan } from "@/lib/billing/access";
import { activatePlanForUser } from "@/lib/billing/activation";
import { isBillingMockPaymentsEnabled } from "@/lib/billing/config";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  plan: z.enum(["publish", "studio"]),
  portfolioId: z.string().uuid().optional(),
});

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key);
}

function getPriceId(plan: "publish" | "studio"): string {
  const envName =
    plan === "publish" ? "STRIPE_PRICE_PUBLISH_999" : "STRIPE_PRICE_STUDIO_2500";
  const value = process.env[envName];
  if (!value) {
    throw new Error(`Missing ${envName}`);
  }
  return value;
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
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const plan = parsed.data.plan;
    const requestedPortfolioId = parsed.data.portfolioId ?? null;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

    const { data: profileRaw, error: profileError } = await supabase
      .from("profiles")
      .select("username, plan")
      .eq("id", user.id)
      .single();
    if (profileError) {
      return NextResponse.json(
        { error: "No se pudo obtener tu perfil." },
        { status: 500 }
      );
    }

    const profile =
      (profileRaw as { username?: string; plan?: ProfilePlan } | null) ?? null;
    const username = profile?.username?.trim().toLowerCase();
    const currentPlan = profile?.plan ?? "free";

    if (!username) {
      return NextResponse.json(
        { error: "Tu usuario no tiene username público configurado." },
        { status: 400 }
      );
    }

    const alreadyPaidOnRequestedPlan =
      (plan === "publish" && isPaidPlan(currentPlan)) ||
      (plan === "studio" && currentPlan === "studio");
    if (alreadyPaidOnRequestedPlan) {
      return NextResponse.json({
        checkoutUrl: `/p/${username}`,
        fallbackUrl: `/p/${username}`,
        mode: "already-active",
        alreadyActive: true,
      });
    }

    let selectedPortfolioId = requestedPortfolioId;
    if (requestedPortfolioId) {
      const { data: selected } = await supabase
        .from("portfolios")
        .select("id")
        .eq("id", requestedPortfolioId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!selected) {
        return NextResponse.json(
          { error: "El portfolio seleccionado no pertenece a tu cuenta." },
          { status: 404 }
        );
      }
    }

    const { data: latestPortfolio } = await supabase
      .from("portfolios")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!selectedPortfolioId) {
      selectedPortfolioId = (latestPortfolio as { id?: string } | null)?.id ?? null;
    }

    const forceMockMode = isBillingMockPaymentsEnabled();
    const hasStripeConfig = Boolean(
      process.env.STRIPE_SECRET_KEY &&
        process.env.STRIPE_PRICE_PUBLISH_999 &&
        process.env.STRIPE_PRICE_STUDIO_2500
    );

    if (forceMockMode || !hasStripeConfig) {
      const targetPlan: ProfilePlan = plan === "publish" ? "premium" : "studio";
      const admin = createAdminClient();
      const activation = await activatePlanForUser({
        admin,
        userId: user.id,
        targetPlan,
        username,
        portfolioId: selectedPortfolioId,
      });

      const successDashboardUrl = `/dashboard?billing=success&plan=${plan}`;
      const checkoutUrl =
        activation.publishedPortfolioId && username
          ? `/p/${username}`
          : successDashboardUrl;
      const fallbackUrl = activation.publishedPortfolioId
        ? username
          ? `/p/${username}`
          : "/dashboard"
        : `/dashboard?billing=success&plan=${plan}`;

      return NextResponse.json({
        checkoutUrl,
        mode: "mock",
        publishedPortfolioId: activation.publishedPortfolioId,
        fallbackUrl,
      });
    }

    const stripe = getStripeClient();
    const mode = plan === "publish" ? "payment" : "subscription";
    const price = getPriceId(plan);
    const successParams = new URLSearchParams({
      billing: "success",
      plan,
    });
    if (selectedPortfolioId) {
      successParams.set("portfolioId", selectedPortfolioId);
    }

    const cancelParams = new URLSearchParams({
      billing: "cancelled",
      plan,
    });
    if (selectedPortfolioId) {
      cancelParams.set("portfolioId", selectedPortfolioId);
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price, quantity: 1 }],
      success_url: `${appUrl}/dashboard?${successParams.toString()}`,
      cancel_url: `${appUrl}/dashboard?${cancelParams.toString()}`,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        plan,
        username,
        portfolioId: selectedPortfolioId ?? "",
      },
      subscription_data:
        plan === "studio"
          ? {
            metadata: {
              userId: user.id,
              plan,
              username,
              portfolioId: selectedPortfolioId ?? "",
            },
          }
          : undefined,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("[billing/checkout] error:", error);
    return NextResponse.json(
      {
        error:
          "No se pudo crear el checkout. Revisa Stripe y las variables de entorno.",
      },
      { status: 500 }
    );
  }
}
