import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isPaidPlan, resolvePlan, type ProfilePlan } from "@/lib/billing/access";
import { activatePlanForUser } from "@/lib/billing/activation";
import { isBillingMockPaymentsEnabled } from "@/lib/billing/config";
import { PRO_PRICE_CENTS } from "@/lib/billing/pricing";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/locale";

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
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: isEn ? "Invalid payload" : "Payload inválido",
          details: parsed.error.flatten(),
        },
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
        {
          error: isEn
            ? "Your profile could not be loaded."
            : "No se pudo obtener tu perfil.",
        },
        { status: 500 }
      );
    }

    const profile =
      (profileRaw as { username?: string; plan?: ProfilePlan } | null) ?? null;
    const username = profile?.username?.trim().toLowerCase();
    const currentPlan = resolvePlan(profile?.plan ?? "free");
    const isStudioUpgradeFromPro = plan === "studio" && currentPlan === "premium";
    const dashboardParams = new URLSearchParams({
      billing: "success",
      plan,
    });
    if (requestedPortfolioId) {
      dashboardParams.set("portfolioId", requestedPortfolioId);
    }
    const successDashboardUrl = `/dashboard?${dashboardParams.toString()}`;

    if (!username) {
      return NextResponse.json(
        {
          error: isEn
            ? "Your account does not have a public username configured."
            : "Tu usuario no tiene username público configurado.",
        },
        { status: 400 }
      );
    }

    const alreadyPaidOnRequestedPlan =
      (plan === "publish" && isPaidPlan(currentPlan)) ||
      (plan === "studio" && currentPlan === "studio");
    if (alreadyPaidOnRequestedPlan) {
      return NextResponse.json({
        checkoutUrl: successDashboardUrl,
        fallbackUrl: successDashboardUrl,
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
          {
            error: isEn
              ? "The selected portfolio does not belong to your account."
              : "El portfolio seleccionado no pertenece a tu cuenta.",
          },
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

      return NextResponse.json({
        checkoutUrl: successDashboardUrl,
        mode: "mock",
        publishedPortfolioId: activation.publishedPortfolioId,
        fallbackUrl: successDashboardUrl,
      });
    }

    const stripe = getStripeClient();
    const mode = plan === "publish" ? "payment" : "subscription";
    const price = getPriceId(plan);
    const successParams = new URLSearchParams({ billing: "success", plan });
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

    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (isStudioUpgradeFromPro) {
      const configuredCouponId = process.env.STRIPE_COUPON_UPGRADE_PRO_TO_STUDIO;
      if (configuredCouponId) {
        discounts = [{ coupon: configuredCouponId }];
      } else {
        const coupon = await stripe.coupons.create({
          amount_off: PRO_PRICE_CENTS,
          currency: "eur",
          duration: "once",
          name: isEn ? "Upgrade Pro to Studio" : "Upgrade Pro a Studio",
          metadata: {
            userId: user.id,
            plan: "studio",
            upgradeFrom: "premium",
          },
        });
        discounts = [{ coupon: coupon.id }];
      }
    }

    const successUrl = `${appUrl}/dashboard?${successParams.toString()}&session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price, quantity: 1 }],
      success_url: successUrl,
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
      allow_promotion_codes: !isStudioUpgradeFromPro,
      discounts,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("[billing/checkout] error:", error);
    const isEn =
      normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value) === "en";
    const errorMessage =
      error instanceof Error
        ? error.message
        : isEn
          ? "The checkout session could not be created. Check Stripe and your environment variables."
          : "No se pudo crear el checkout. Revisa Stripe y las variables de entorno.";
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
