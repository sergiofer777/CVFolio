import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isBillingMockPaymentsEnabled } from "@/lib/billing/config";
import { createStripeServerClient } from "@/lib/billing/stripe-server";
import { getUserBillingSubscriptionStatus } from "@/lib/billing/subscription-status";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/locale";

export const runtime = "nodejs";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return createStripeServerClient(key);
}

function getRequiredPriceId(envName: string): string {
  const value = process.env[envName]?.trim();
  if (!value) {
    throw new Error(`Missing ${envName}`);
  }
  return value;
}

async function getOrCreateDowngradePortalConfiguration(
  stripe: Stripe,
  appUrl: string
): Promise<string> {
  const configuredId =
    process.env.STRIPE_BILLING_PORTAL_DOWNGRADE_CONFIGURATION_ID?.trim() ?? "";
  if (configuredId) return configuredId;

  const existing = await stripe.billingPortal.configurations.list({ limit: 100 });
  const managed = existing.data.find(
    (config) =>
      config.active &&
      config.metadata?.managed_by === "webiculum" &&
      config.metadata?.purpose === "studio_to_pro_downgrade"
  );

  if (managed) return managed.id;

  const proPriceId = getRequiredPriceId("STRIPE_PRICE_PUBLISH_999");
  const studioPriceId = getRequiredPriceId("STRIPE_PRICE_STUDIO_2500");

  const [proPrice, studioPrice] = await Promise.all([
    stripe.prices.retrieve(proPriceId),
    stripe.prices.retrieve(studioPriceId),
  ]);

  const proProductId =
    typeof proPrice.product === "string" ? proPrice.product : null;
  const studioProductId =
    typeof studioPrice.product === "string" ? studioPrice.product : null;

  if (!proProductId || !studioProductId) {
    throw new Error("Stripe prices are missing a linked product.");
  }

  const configuration = await stripe.billingPortal.configurations.create({
    default_return_url: `${appUrl}/dashboard/billing`,
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "none",
        schedule_at_period_end: {
          conditions: [{ type: "decreasing_item_amount" }],
        },
        products: [
          { product: studioProductId, prices: [studioPriceId] },
          { product: proProductId, prices: [proPriceId] },
        ],
      },
    },
    metadata: {
      managed_by: "webiculum",
      purpose: "studio_to_pro_downgrade",
    },
  });

  return configuration.id;
}

export async function POST(request: NextRequest) {
  const isEn =
    normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value) === "en";

  try {
    if (isBillingMockPaymentsEnabled()) {
      return NextResponse.json(
        {
          error: isEn
            ? "Plan changes are unavailable while mock billing is enabled."
            : "Los cambios de plan no están disponibles mientras el cobro simulado está activo.",
        },
        { status: 409 }
      );
    }

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

    const admin = createAdminClient();
    const { data: profileRaw, error: profileError } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const currentPlan =
      ((profileRaw as { plan?: string } | null)?.plan ?? "free").trim().toLowerCase();

    if (currentPlan !== "studio") {
      return NextResponse.json(
        {
          error: isEn
            ? "Only Studio subscriptions can be downgraded to Pro."
            : "Solo las suscripciones Studio pueden bajarse a Pro.",
        },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();
    const subscriptionStatus = await getUserBillingSubscriptionStatus(user.id);
    const customerId = subscriptionStatus?.stripeCustomerId ?? null;
    const subscriptionId = subscriptionStatus?.stripeSubscriptionId ?? null;

    if (!customerId || !subscriptionId) {
      return NextResponse.json(
        {
          error: isEn
            ? "We could not find an active Stripe subscription linked to your account."
            : "No hemos encontrado una suscripción de Stripe activa vinculada a tu cuenta.",
        },
        { status: 404 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItem = subscription.items.data[0] ?? null;

    if (!subscriptionItem) {
      throw new Error("Stripe subscription item not found.");
    }

    const proPriceId = getRequiredPriceId("STRIPE_PRICE_PUBLISH_999");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const configurationId = await getOrCreateDowngradePortalConfiguration(
      stripe,
      appUrl
    );

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      configuration: configurationId,
      return_url: `${appUrl}/dashboard/billing`,
      flow_data: {
        type: "subscription_update_confirm",
        after_completion: {
          type: "redirect",
          redirect: {
            return_url: `${appUrl}/dashboard/billing`,
          },
        },
        subscription_update_confirm: {
          subscription: subscription.id,
          items: [
            {
              id: subscriptionItem.id,
              price: proPriceId,
              quantity: subscriptionItem.quantity ?? 1,
            },
          ],
        },
      },
    });

    return NextResponse.json({ portalUrl: session.url });
  } catch (error) {
    console.error("[billing/downgrade-to-pro] error:", error);
    const message =
      error instanceof Error
        ? error.message
        : isEn
          ? "Could not open the downgrade flow."
          : "No se pudo abrir el flujo de cambio a Pro.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
