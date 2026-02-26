import { getPlanLimits, resolvePlan, type ProfilePlan } from "@/lib/billing/access";

export type UsageMetric = "generation" | "chat_iteration";

interface BillingUsageRow {
  user_id: string;
  period_key: string;
  generation_count: number;
  chat_iteration_count: number;
  updated_at?: string;
}

interface UsageSnapshotBase {
  plan: ProfilePlan;
  periodKey: string;
  generationUsed: number;
  generationLimit: number | null;
  generationRemaining: number | null;
  chatIterationsUsed: number;
  chatIterationLimit: number | null;
  chatIterationsRemaining: number | null;
}

export interface UsageSnapshotResult extends UsageSnapshotBase {
  storageReady: boolean;
}

export interface ConsumeUsageResult extends UsageSnapshotBase {
  allowed: boolean;
  storageReady: boolean;
  reason?: string;
}

function getPeriodKey(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  if (!err.message) return false;
  return /relation .* does not exist|table .* does not exist/i.test(err.message);
}

function buildSnapshot(
  plan: ProfilePlan,
  periodKey: string,
  usage: BillingUsageRow,
  storageReady: boolean
): UsageSnapshotResult {
  const limits = getPlanLimits(plan);
  const generationLimit = limits.generationLimit;
  const chatIterationLimit = limits.chatIterationLimit;

  const generationUsed = usage.generation_count;
  const chatIterationsUsed = usage.chat_iteration_count;

  return {
    plan,
    periodKey,
    generationUsed,
    generationLimit,
    generationRemaining:
      generationLimit === null ? null : Math.max(generationLimit - generationUsed, 0),
    chatIterationsUsed,
    chatIterationLimit,
    chatIterationsRemaining:
      chatIterationLimit === null
        ? null
        : Math.max(chatIterationLimit - chatIterationsUsed, 0),
    storageReady,
  };
}

async function loadUsageRow(
  admin: any,
  userId: string,
  periodKey: string
): Promise<{ row: BillingUsageRow; storageReady: boolean }> {
  const emptyRow: BillingUsageRow = {
    user_id: userId,
    period_key: periodKey,
    generation_count: 0,
    chat_iteration_count: 0,
  };

  const { data, error } = await admin
    .from("billing_usage")
    .select("user_id, period_key, generation_count, chat_iteration_count")
    .eq("user_id", userId)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return { row: emptyRow, storageReady: false };
    }
    throw error;
  }

  const usageRow = (data as BillingUsageRow | null) ?? emptyRow;
  return { row: usageRow, storageReady: true };
}

export async function getUsageSnapshot(params: {
  admin: any;
  userId: string;
  plan: ProfilePlan | null | undefined;
  now?: Date;
}): Promise<UsageSnapshotResult> {
  const periodKey = getPeriodKey(params.now);
  const resolvedPlan = resolvePlan(params.plan);
  const { row, storageReady } = await loadUsageRow(
    params.admin,
    params.userId,
    periodKey
  );
  return buildSnapshot(resolvedPlan, periodKey, row, storageReady);
}

export async function consumeUsage(params: {
  admin: any;
  userId: string;
  plan: ProfilePlan | null | undefined;
  metric: UsageMetric;
  now?: Date;
}): Promise<ConsumeUsageResult> {
  const resolvedPlan = resolvePlan(params.plan);
  const periodKey = getPeriodKey(params.now);
  const { row, storageReady } = await loadUsageRow(
    params.admin,
    params.userId,
    periodKey
  );
  const limits = getPlanLimits(resolvedPlan);

  const currentCount =
    params.metric === "generation"
      ? row.generation_count
      : row.chat_iteration_count;
  const limit =
    params.metric === "generation"
      ? limits.generationLimit
      : limits.chatIterationLimit;

  if (limit !== null && currentCount >= limit) {
    return {
      ...buildSnapshot(resolvedPlan, periodKey, row, storageReady),
      allowed: false,
      reason:
        params.metric === "generation"
          ? "Límite de generaciones alcanzado"
          : "Límite de iteraciones de chat alcanzado",
    };
  }

  // Si la tabla aún no existe, dejamos pasar sin bloquear.
  if (!storageReady) {
    return {
      ...buildSnapshot(resolvedPlan, periodKey, row, storageReady),
      allowed: true,
      reason: "billing_usage table missing: usage tracking disabled",
    };
  }

  const nextRow: BillingUsageRow = {
    ...row,
    generation_count:
      params.metric === "generation" ? row.generation_count + 1 : row.generation_count,
    chat_iteration_count:
      params.metric === "chat_iteration"
        ? row.chat_iteration_count + 1
        : row.chat_iteration_count,
  };

  const { error: upsertError } = await params.admin
    .from("billing_usage")
    .upsert(nextRow, { onConflict: "user_id,period_key" });
  if (upsertError) {
    throw upsertError;
  }

  return {
    ...buildSnapshot(resolvedPlan, periodKey, nextRow, storageReady),
    allowed: true,
  };
}
