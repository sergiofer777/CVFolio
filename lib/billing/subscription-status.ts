import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { createStripeServerClient } from "@/lib/billing/stripe-server";
import { type ProfilePlan } from "@/lib/billing/access";

type BillingSubscriptionRow = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  updated_at?: string | null;
};

export interface UserBillingSubscriptionStatus {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  currentPlan: ProfilePlan | null;
  scheduledPlan: ProfilePlan | null;
  scheduledChangeAt: Date | null;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  if (!err.message) return false;
  return /relation .* does not exist|table .* does not exist/i.test(err.message);
}

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return createStripeServerClient(key);
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateFromStripeTimestamp(value?: number | null): Date | null {
  if (!value) return null;
  return new Date(value * 1000);
}

function getConfiguredPriceId(plan: "premium" | "studio"): string | null {
  const envName =
    plan === "premium" ? "STRIPE_PRICE_PUBLISH_999" : "STRIPE_PRICE_STUDIO_2500";
  return process.env[envName]?.trim() || null;
}

function resolvePlanFromStripePriceId(
  priceId?: string | null
): ProfilePlan | null {
  if (!priceId) return null;
  if (priceId === getConfiguredPriceId("studio")) return "studio";
  if (priceId === getConfiguredPriceId("premium")) return "premium";
  return null;
}

function getSubscriptionItemPriceId(
  item?: Stripe.SubscriptionItem | null
): string | null {
  if (!item) return null;
  return item.price?.id ?? null;
}

function getSchedulePhasePriceId(
  item?: Stripe.SubscriptionSchedule.Phase.Item | null
): string | null {
  if (!item) return null;
  return typeof item.price === "string" ? item.price : item.price?.id ?? null;
}

async function getScheduledPlanChange(params: {
  stripe: Stripe;
  subscription: Stripe.Subscription;
}): Promise<{
  scheduledPlan: ProfilePlan | null;
  scheduledChangeAt: Date | null;
}> {
  const pendingPriceId =
    params.subscription.pending_update?.subscription_items?.[0]
      ? getSubscriptionItemPriceId(
          params.subscription.pending_update.subscription_items[0]
        )
      : null;
  const pendingPlan = resolvePlanFromStripePriceId(pendingPriceId);
  if (pendingPlan) {
    return {
      scheduledPlan: pendingPlan,
      scheduledChangeAt:
        toDateFromStripeTimestamp(
          params.subscription.pending_update?.billing_cycle_anchor
        ) ?? toDateFromStripeTimestamp(params.subscription.current_period_end),
    };
  }

  const scheduleRef = params.subscription.schedule;
  if (!scheduleRef) {
    return { scheduledPlan: null, scheduledChangeAt: null };
  }

  const schedule =
    typeof scheduleRef === "string"
      ? await params.stripe.subscriptionSchedules.retrieve(scheduleRef)
      : scheduleRef;

  const nextPhaseStart =
    schedule.current_phase?.end_date ?? params.subscription.current_period_end;
  const nextPhase =
    schedule.phases.find((phase) => phase.start_date >= nextPhaseStart) ?? null;

  const nextPlan = resolvePlanFromStripePriceId(
    getSchedulePhasePriceId(nextPhase?.items?.[0] ?? null)
  );

  if (!nextPlan) {
    return { scheduledPlan: null, scheduledChangeAt: null };
  }

  return {
    scheduledPlan: nextPlan,
    scheduledChangeAt: toDateFromStripeTimestamp(nextPhase?.start_date ?? null),
  };
}

function pickBestSubscription(
  rows: BillingSubscriptionRow[]
): BillingSubscriptionRow | null {
  if (rows.length === 0) return null;

  const active =
    rows.find((row) =>
      row.status === "active" ||
      row.status === "trialing" ||
      row.status === "past_due"
    ) ?? null;

  return active ?? rows[0] ?? null;
}

export async function getUserBillingSubscriptionStatus(
  userId: string
): Promise<UserBillingSubscriptionStatus | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("billing_subscriptions")
    .select(
      "stripe_customer_id, stripe_subscription_id, status, current_period_end, updated_at"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }

  const rows = (data as BillingSubscriptionRow[] | null) ?? [];
  const selected = pickBestSubscription(rows);
  if (!selected) return null;

  const fallback: UserBillingSubscriptionStatus = {
    stripeCustomerId: selected.stripe_customer_id?.trim() ?? null,
    stripeSubscriptionId: selected.stripe_subscription_id?.trim() ?? null,
    status: selected.status?.trim() ?? null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: parseIsoDate(selected.current_period_end),
    currentPlan: null,
    scheduledPlan: null,
    scheduledChangeAt: null,
  };

  const stripe = getStripeClient();
  if (!stripe || !fallback.stripeSubscriptionId) {
    return fallback;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(
      fallback.stripeSubscriptionId
    );
    const scheduledChange = await getScheduledPlanChange({ stripe, subscription });

    return {
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : fallback.stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd:
        toDateFromStripeTimestamp(subscription.current_period_end) ??
        fallback.currentPeriodEnd,
      currentPlan:
        resolvePlanFromStripePriceId(
          getSubscriptionItemPriceId(subscription.items.data[0] ?? null)
        ) ?? null,
      scheduledPlan: scheduledChange.scheduledPlan,
      scheduledChangeAt: scheduledChange.scheduledChangeAt,
    };
  } catch (error) {
    console.error(
      "[billing/subscription-status] could not load live Stripe subscription:",
      error
    );
    return fallback;
  }
}

export function formatBillingDateTime(
  date: Date | null,
  locale: "es" | "en"
): string {
  if (!date) return "";

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
