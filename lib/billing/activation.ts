import { upsertCloudflareSubdomainRecord } from "@/lib/cloudflare/dns";
import type { ProfilePlan } from "@/lib/billing/access";

interface PublishSelectionParams {
  admin: any;
  userId: string;
  portfolioId?: string | null;
}

interface ActivatePlanParams extends PublishSelectionParams {
  targetPlan: ProfilePlan;
  username?: string | null;
}

export interface ActivatePlanResult {
  publishedPortfolioId: string | null;
  publicFqdn: string | null;
}

function isProfilesPlanConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  return (
    err.code === "23514" &&
    typeof err.message === "string" &&
    err.message.includes("profiles_plan_check")
  );
}

export function buildPublicPortfolioUrl(username: string): string {
  const rootDomain = (process.env.ROOT_DOMAIN ?? "webiculum.com").toLowerCase();
  return `https://${username}.${rootDomain}`;
}

async function resolvePortfolioIdForPublish({
  admin,
  userId,
  portfolioId,
}: PublishSelectionParams): Promise<string | null> {
  if (portfolioId) {
    const { data: selected } = await admin
      .from("portfolios")
      .select("id")
      .eq("id", portfolioId)
      .eq("user_id", userId)
      .maybeSingle();

    const selectedId = (selected as { id?: string } | null)?.id ?? null;
    if (selectedId) return selectedId;
  }

  const { data: latest } = await admin
    .from("portfolios")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (latest as { id?: string } | null)?.id ?? null;
}

export async function publishSelectedPortfolio({
  admin,
  userId,
  portfolioId,
}: PublishSelectionParams): Promise<string | null> {
  const targetPortfolioId = await resolvePortfolioIdForPublish({
    admin,
    userId,
    portfolioId,
  });
  if (!targetPortfolioId) return null;

  const nowIso = new Date().toISOString();

  const { error: resetError } = await admin
    .from("portfolios")
    .update({
      is_published: false,
      is_public: false,
      published_at: null,
    })
    .eq("user_id", userId);
  if (resetError) throw resetError;

  const { error: publishError } = await admin
    .from("portfolios")
    .update({
      is_published: true,
      is_public: true,
      published_at: nowIso,
    })
    .eq("id", targetPortfolioId)
    .eq("user_id", userId);
  if (publishError) throw publishError;

  return targetPortfolioId;
}

export async function activatePlanForUser({
  admin,
  userId,
  targetPlan,
  username,
  portfolioId,
}: ActivatePlanParams): Promise<ActivatePlanResult> {
  const { error: planUpdateError } = await admin
    .from("profiles")
    .update({ plan: targetPlan })
    .eq("id", userId);

  if (planUpdateError) {
    if (targetPlan === "studio" && isProfilesPlanConstraintError(planUpdateError)) {
      throw new Error(
        "Tu base de datos aún no admite el plan Studio. Ejecuta la migración SQL de monetización para añadir 'studio' al constraint de profiles.plan."
      );
    }
    throw planUpdateError;
  }

  const publishedPortfolioId = await publishSelectedPortfolio({
    admin,
    userId,
    portfolioId,
  });

  let publicFqdn: string | null = null;
  if (username) {
    try {
      await upsertCloudflareSubdomainRecord(username);
      publicFqdn = `${username}.${(process.env.ROOT_DOMAIN ?? "webiculum.com").toLowerCase()}`;
    } catch (error) {
      console.error("[billing/activation] subdomain provision error:", error);
    }
  }

  return { publishedPortfolioId, publicFqdn };
}
