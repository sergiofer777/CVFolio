const FREE_PREVIEW_WINDOW_HOURS = 24;

export type ProfilePlan = "free" | "premium" | "studio";

export interface PlanLimits {
  generationLimit: number | null;
  chatIterationLimit: number | null;
  chatIterationLimitPerPortfolio: number | null;
  publicationLifetimeHours: number | null;
}

export interface PreviewAccessInput {
  plan: ProfilePlan | null | undefined;
  portfolioUpdatedAt: string | null | undefined;
  now?: Date;
}

export interface PreviewAccessResult {
  isPaid: boolean;
  // Backward compatibility with previous checks in pages/components.
  isPremium: boolean;
  isStudio: boolean;
  isFreePlan: boolean;
  expiresAt: Date | null;
  isExpired: boolean;
  hoursLeft: number | null;
}

export interface PublicationAccessInput {
  plan: ProfilePlan | null | undefined;
  publishedAt: string | null | undefined;
  now?: Date;
}

export interface PublicationAccessResult {
  isPaid: boolean;
  expiresAt: Date | null;
  isExpired: boolean;
}

const PLAN_LIMITS: Record<ProfilePlan, PlanLimits> = {
  free: {
    generationLimit: 1,
    chatIterationLimit: 0,
    chatIterationLimitPerPortfolio: 0,
    publicationLifetimeHours: FREE_PREVIEW_WINDOW_HOURS,
  },
  premium: {
    generationLimit: 1,
    chatIterationLimit: 0,
    chatIterationLimitPerPortfolio: 0,
    publicationLifetimeHours: null,
  },
  studio: {
    generationLimit: 3,
    chatIterationLimit: 9,
    chatIterationLimitPerPortfolio: 3,
    publicationLifetimeHours: null,
  },
};

export function resolvePlan(
  plan: ProfilePlan | string | null | undefined
): ProfilePlan {
  if (!plan) return "free";
  const normalized = String(plan).trim().toLowerCase();

  if (normalized === "studio") return "studio";
  if (
    normalized === "premium" ||
    normalized === "pro" ||
    normalized === "publish" ||
    normalized === "paid"
  ) {
    return "premium";
  }

  return "free";
}

export function isPaidPlan(
  plan: ProfilePlan | string | null | undefined
): boolean {
  const resolvedPlan = resolvePlan(plan);
  return resolvedPlan === "premium" || resolvedPlan === "studio";
}

export function getPlanLimits(plan: ProfilePlan | null | undefined): PlanLimits {
  return PLAN_LIMITS[resolvePlan(plan)];
}

export function getFreePreviewAccess({
  plan,
  portfolioUpdatedAt,
  now = new Date(),
}: PreviewAccessInput): PreviewAccessResult {
  const resolvedPlan = resolvePlan(plan);
  const isPaid = isPaidPlan(resolvedPlan);
  const isStudio = resolvedPlan === "studio";
  const isFreePlan = !isPaid;

  if (!portfolioUpdatedAt) {
    return {
      isPaid,
      isPremium: isPaid,
      isStudio,
      isFreePlan,
      expiresAt: null,
      isExpired: false,
      hoursLeft: null,
    };
  }

  const updatedAt = new Date(portfolioUpdatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    return {
      isPaid,
      isPremium: isPaid,
      isStudio,
      isFreePlan,
      expiresAt: null,
      isExpired: false,
      hoursLeft: null,
    };
  }

  const expiresAt = new Date(
    updatedAt.getTime() + FREE_PREVIEW_WINDOW_HOURS * 60 * 60 * 1000
  );

  if (isPaid) {
    return {
      isPaid,
      isPremium: true,
      isStudio,
      isFreePlan,
      expiresAt,
      isExpired: false,
      hoursLeft: null,
    };
  }

  const diffMs = expiresAt.getTime() - now.getTime();
  const isExpired = diffMs <= 0;
  const hoursLeft = isExpired ? 0 : Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));

  return {
    isPaid,
    isPremium: false,
    isStudio,
    isFreePlan,
    expiresAt,
    isExpired,
    hoursLeft,
  };
}

export function formatExpirationDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getPublicationAccess({
  plan,
  publishedAt,
  now = new Date(),
}: PublicationAccessInput): PublicationAccessResult {
  const resolvedPlan = resolvePlan(plan);
  const isPaid = isPaidPlan(resolvedPlan);
  if (!isPaid) {
    return {
      isPaid: false,
      expiresAt: null,
      isExpired: true,
    };
  }

  const lifetimeHours = getPlanLimits(resolvedPlan).publicationLifetimeHours;
  if (lifetimeHours === null) {
    return {
      isPaid: true,
      expiresAt: null,
      isExpired: false,
    };
  }

  if (!publishedAt) {
    return {
      isPaid: true,
      expiresAt: null,
      isExpired: false,
    };
  }

  const publishedDate = new Date(publishedAt);
  if (Number.isNaN(publishedDate.getTime())) {
    return {
      isPaid: true,
      expiresAt: null,
      isExpired: false,
    };
  }

  const expiresAt = new Date(publishedDate.getTime() + lifetimeHours * 60 * 60 * 1000);
  return {
    isPaid: true,
    expiresAt,
    isExpired: expiresAt.getTime() <= now.getTime(),
  };
}
