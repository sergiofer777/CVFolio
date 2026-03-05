import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { activatePlanForUser } from "@/lib/billing/activation";
import { resolvePlan, type ProfilePlan } from "@/lib/billing/access";
import { createStripeServerClient } from "@/lib/billing/stripe-server";

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return createStripeServerClient(key);
}

function resolveTargetPlan(checkoutPlan: string | undefined): ProfilePlan | null {
  if (checkoutPlan === "studio") return "studio";
  if (checkoutPlan === "publish") return "premium";
  return null;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  if (!err.message) return false;
  return /relation .* does not exist|table .* does not exist/i.test(err.message);
}

async function upsertSubscriptionRecord(params: {
  admin: any;
  userId: string;
  session: Stripe.Checkout.Session;
}): Promise<void> {
  const stripeCustomerId =
    typeof params.session.customer === "string" ? params.session.customer : null;
  const stripeSubscriptionId =
    typeof params.session.subscription === "string"
      ? params.session.subscription
      : null;

  if (!stripeCustomerId || !stripeSubscriptionId) return;

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
}

export interface ConfirmStripeCheckoutResult {
  activated: boolean;
  reason:
    | "ok"
    | "already-active"
    | "stripe-not-configured"
    | "session-not-found"
    | "session-user-mismatch"
    | "session-incomplete"
    | "payment-not-paid"
    | "subscription-not-found"
    | "subscription-not-active"
    | "unknown-plan";
}

function isActiveSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export async function confirmStripeCheckoutForUser(params: {
  userId: string;
  sessionId: string;
}): Promise<ConfirmStripeCheckoutResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { activated: false, reason: "stripe-not-configured" };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(params.sessionId);
  } catch {
    return { activated: false, reason: "session-not-found" };
  }

  const sessionUserId = session.metadata?.userId ?? session.client_reference_id ?? null;
  if (!sessionUserId || sessionUserId !== params.userId) {
    return { activated: false, reason: "session-user-mismatch" };
  }

  if (session.status !== "complete") {
    return { activated: false, reason: "session-incomplete" };
  }
  if (session.mode === "payment" && session.payment_status !== "paid") {
    return { activated: false, reason: "payment-not-paid" };
  }

  if (session.mode === "subscription") {
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : null;
    if (!subscriptionId) {
      return { activated: false, reason: "subscription-not-found" };
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!isActiveSubscriptionStatus(subscription.status)) {
        return { activated: false, reason: "subscription-not-active" };
      }
    } catch {
      return { activated: false, reason: "subscription-not-found" };
    }
  }

  const targetPlan = resolveTargetPlan(session.metadata?.plan);
  if (!targetPlan) {
    return { activated: false, reason: "unknown-plan" };
  }

  const admin = createAdminClient();
  await upsertSubscriptionRecord({
    admin,
    userId: params.userId,
    session,
  });

  const { data: profileRaw } = await admin
    .from("profiles")
    .select("username, plan")
    .eq("id", params.userId)
    .maybeSingle();
  const profile =
    (profileRaw as { username?: string; plan?: ProfilePlan | string } | null) ?? null;

  const currentPlan = resolvePlan(profile?.plan);
  const alreadyActive =
    currentPlan === "studio" ||
    (targetPlan === "premium" && currentPlan === "premium");
  if (alreadyActive) {
    return { activated: true, reason: "already-active" };
  }

  const username = (session.metadata?.username ?? profile?.username ?? "")
    .trim()
    .toLowerCase();
  const portfolioId = session.metadata?.portfolioId ?? null;

  await activatePlanForUser({
    admin,
    userId: params.userId,
    targetPlan,
    username: username || null,
    portfolioId,
  });

  return { activated: true, reason: "ok" };
}

export async function confirmLatestStripeCheckoutForUser(params: {
  userId: string;
  expectedPlan: "premium" | "studio";
}): Promise<ConfirmStripeCheckoutResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { activated: false, reason: "stripe-not-configured" };
  }

  const expectedCheckoutPlan = params.expectedPlan === "studio" ? "studio" : "publish";
  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  const recentThresholdMs = Date.now() - 2 * 24 * 60 * 60 * 1000;

  const matching = sessions.data.find((session) => {
    const sessionUserId =
      session.metadata?.userId ?? session.client_reference_id ?? null;
    if (!sessionUserId || sessionUserId !== params.userId) return false;
    if (session.metadata?.plan !== expectedCheckoutPlan) return false;
    if (session.status !== "complete") return false;
    if (session.mode === "payment" && session.payment_status !== "paid") return false;
    if ((session.created ?? 0) * 1000 < recentThresholdMs) return false;
    return true;
  });

  if (!matching) {
    return { activated: false, reason: "session-not-found" };
  }

  return confirmStripeCheckoutForUser({
    userId: params.userId,
    sessionId: matching.id,
  });
}
