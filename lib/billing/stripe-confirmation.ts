import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { activatePlanForUser } from "@/lib/billing/activation";
import { resolvePlan, type ProfilePlan } from "@/lib/billing/access";

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function resolveTargetPlan(checkoutPlan: string | undefined): ProfilePlan | null {
  if (checkoutPlan === "studio") return "studio";
  if (checkoutPlan === "publish") return "premium";
  return null;
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
    | "unknown-plan";
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

  const targetPlan = resolveTargetPlan(session.metadata?.plan);
  if (!targetPlan) {
    return { activated: false, reason: "unknown-plan" };
  }

  const admin = createAdminClient();
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

  const matching = sessions.data.find((session) => {
    const sessionUserId =
      session.metadata?.userId ?? session.client_reference_id ?? null;
    if (!sessionUserId || sessionUserId !== params.userId) return false;
    if (session.metadata?.plan !== expectedCheckoutPlan) return false;
    if (session.status !== "complete") return false;
    if (session.mode === "payment" && session.payment_status !== "paid") return false;
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
