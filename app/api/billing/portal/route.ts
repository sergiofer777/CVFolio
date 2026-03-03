import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isBillingMockPaymentsEnabled } from "@/lib/billing/config";
import { isPaidPlan, resolvePlan, type ProfilePlan } from "@/lib/billing/access";
import { createStripeServerClient } from "@/lib/billing/stripe-server";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/locale";

export const runtime = "nodejs";

type BillingSubscriptionLookup = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return createStripeServerClient(key);
}

function isActiveSubscriptionStatus(status?: string | null): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  if (!err.message) return false;
  return /relation .* does not exist|table .* does not exist/i.test(err.message);
}

async function recoverCustomerIdFromRecentCheckout(params: {
  admin: any;
  userId: string;
  stripe: Stripe;
}): Promise<string | null> {
  const sessions = await params.stripe.checkout.sessions.list({ limit: 100 });

  const matchingSession = sessions.data.find((session) => {
    const sessionUserId =
      session.metadata?.userId ?? session.client_reference_id ?? null;
    if (sessionUserId !== params.userId) return false;
    if (session.mode !== "subscription") return false;
    if (session.status !== "complete") return false;
    if (typeof session.customer !== "string") return false;
    if (typeof session.subscription !== "string") return false;
    return true;
  });

  if (!matchingSession) return null;

  const stripeCustomerId =
    typeof matchingSession.customer === "string" ? matchingSession.customer : null;
  const stripeSubscriptionId =
    typeof matchingSession.subscription === "string"
      ? matchingSession.subscription
      : null;

  if (!stripeCustomerId || !stripeSubscriptionId) return null;

  const { error } = await params.admin
    .from("billing_subscriptions")
    .upsert(
      {
        user_id: params.userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        status: "active",
      },
      { onConflict: "stripe_subscription_id" }
    );

  if (error && !isMissingRelationError(error)) {
    throw error;
  }

  return stripeCustomerId;
}

export async function POST(request: NextRequest) {
  const isEn =
    normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value) === "en";

  try {
    if (isBillingMockPaymentsEnabled()) {
      return NextResponse.json(
        {
          error: isEn
            ? "Subscription management is unavailable while mock billing is enabled."
            : "La gestión de suscripción no está disponible mientras el cobro simulado está activo.",
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

    const plan = resolvePlan(
      ((profileRaw as { plan?: ProfilePlan } | null)?.plan ?? "free") as ProfilePlan
    );

    if (!isPaidPlan(plan)) {
      return NextResponse.json(
        {
          error: isEn
            ? "You need an active paid subscription to manage billing."
            : "Necesitas una suscripción de pago activa para gestionar la facturación.",
        },
        { status: 402 }
      );
    }

    const { data: subscriptionsRaw, error: subscriptionsError } = await admin
      .from("billing_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    const subscriptions =
      (subscriptionsRaw as BillingSubscriptionLookup[] | null) ?? [];

    const subscription =
      subscriptions.find((row) => isActiveSubscriptionStatus(row.status)) ??
      subscriptions.find((row) => Boolean(row.stripe_customer_id)) ??
      null;

    let customerId = subscription?.stripe_customer_id?.trim() ?? null;
    const stripe = getStripeClient();

    if (!customerId) {
      customerId = await recoverCustomerIdFromRecentCheckout({
        admin,
        userId: user.id,
        stripe,
      });
    }

    if (!customerId) {
      return NextResponse.json(
        {
          error: isEn
            ? "We could not find a Stripe customer linked to your account."
            : "No hemos encontrado un cliente de Stripe vinculado a tu cuenta.",
        },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.json({ portalUrl: session.url });
  } catch (error) {
    console.error("[billing/portal] error:", error);
    const message =
      error instanceof Error
        ? error.message
        : isEn
          ? "Could not open subscription management."
          : "No se pudo abrir la gestión de suscripción.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
