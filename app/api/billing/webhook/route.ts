import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import type { ProfilePlan } from "@/lib/billing/access";
import { activatePlanForUser } from "@/lib/billing/activation";

export const runtime = "nodejs";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key);
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  if (!err.message) return false;
  return /relation .* does not exist|table .* does not exist/i.test(err.message);
}

function resolveTargetPlan(checkoutPlan: string | undefined): ProfilePlan {
  if (checkoutPlan === "studio") return "studio";
  if (checkoutPlan === "publish") return "premium";
  return "free";
}

function toIsoFromStripeTimestamp(value?: number | null): string | null {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

async function upsertSubscriptionRecord(params: {
  admin: any;
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status?: string | null;
  currentPeriodEnd?: number | null;
}): Promise<void> {
  if (!params.stripeCustomerId || !params.stripeSubscriptionId) return;

  const payload = {
    user_id: params.userId,
    stripe_customer_id: params.stripeCustomerId,
    stripe_subscription_id: params.stripeSubscriptionId,
    status: params.status ?? "active",
    current_period_end: toIsoFromStripeTimestamp(params.currentPeriodEnd),
  };

  const { error } = await params.admin
    .from("billing_subscriptions")
    .upsert(payload, { onConflict: "stripe_subscription_id" });

  if (error && !isMissingRelationError(error)) {
    throw error;
  }
}

async function applyCheckoutSessionEntitlements(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  if (!userId || !plan) {
    console.warn("[billing/webhook] missing metadata in checkout session");
    return;
  }

  const admin = createAdminClient();
  const targetPlan = resolveTargetPlan(plan);
  if (targetPlan === "free") {
    console.warn("[billing/webhook] unknown checkout plan:", plan);
    return;
  }

  const { data: profileRaw } = await admin
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  const profile = (profileRaw as { username?: string } | null) ?? null;
  const username = session.metadata?.username ?? profile?.username ?? null;
  const portfolioId = session.metadata?.portfolioId ?? null;

  await activatePlanForUser({
    admin,
    userId,
    targetPlan,
    username,
    portfolioId,
  });

  if (targetPlan === "studio") {
    await upsertSubscriptionRecord({
      admin,
      userId,
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : null,
      stripeSubscriptionId:
        typeof session.subscription === "string" ? session.subscription : null,
      status: "active",
    });
  }
}

async function syncSubscriptionStatus(
  subscription: Stripe.Subscription
): Promise<void> {
  const admin = createAdminClient();

  const { data: existing, error: lookupError } = await admin
    .from("billing_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (lookupError) {
    if (isMissingRelationError(lookupError)) return;
    throw lookupError;
  }

  const userId = (existing as { user_id?: string } | null)?.user_id;
  if (!userId) return;

  await upsertSubscriptionRecord({
    admin,
    userId,
    stripeCustomerId:
      typeof subscription.customer === "string" ? subscription.customer : null,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
  });
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getWebhookSecret()
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await applyCheckoutSessionEntitlements(session);
    }
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscriptionStatus(subscription);
    }
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscriptionStatus(subscription);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[billing/webhook] error:", error);
    return NextResponse.json(
      { error: "Webhook error", details: String(error) },
      { status: 400 }
    );
  }
}
