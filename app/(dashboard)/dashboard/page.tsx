import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortfolioRenderer } from "@/components/portfolio/portfolio-renderer";
import { PortfolioIterationChat } from "@/components/dashboard/portfolio-iteration-chat";
import { PublicPortfolioButton } from "@/components/dashboard/public-portfolio-button";
import { PublicSubdomainSettings } from "@/components/dashboard/public-subdomain-settings";
import { LinkSubdomainButton } from "@/components/dashboard/link-subdomain-button";
import { DowngradeToProButton } from "@/components/billing/downgrade-to-pro-button";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import { LocaleToggle } from "@/components/locale-toggle";
import { LogoutButton } from "@/components/auth/logout-button";
import { FreePreviewCountdown } from "@/components/dashboard/free-preview-countdown";
import { getServerLocale } from "@/lib/locale-server";
import {
  Upload,
  Eye,
  Monitor,
  Lock,
  Clock3,
  Download,
  CircleHelp,
} from "lucide-react";
import type { CVData, PortfolioTheme } from "@/types/cv-data";
import {
  formatExpirationDate,
  getFreePreviewAccess,
  getPlanLimits,
  resolvePlan,
  type ProfilePlan,
} from "@/lib/billing/access";
import {
  STUDIO_PRICE_EUR,
  STUDIO_UPGRADE_FROM_PRO_EUR,
  formatEuro,
} from "@/lib/billing/pricing";
import {
  isBillingEnforcementEnabled,
  isBillingMockPaymentsEnabled,
} from "@/lib/billing/config";
import { PORTFOLIO_THEME_OPTIONS } from "@/lib/templates/portfolio-themes";
import { buildPublicPortfolioUrl } from "@/lib/billing/activation";
import {
  confirmLatestStripeCheckoutForUser,
  confirmStripeCheckoutForUser,
} from "@/lib/billing/stripe-confirmation";
import {
  formatBillingDateTime,
  getUserBillingSubscriptionStatus,
} from "@/lib/billing/subscription-status";

interface DashboardPortfolioRow {
  id: string;
  cv_data: CVData;
  theme: PortfolioTheme | null;
  is_published: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  version: number | null;
}

function getThemeName(theme: PortfolioTheme | null): string {
  if (!theme) return "Template Sergio";
  return (
    PORTFOLIO_THEME_OPTIONS.find((option) => option.id === theme)?.name ??
    "Template Sergio"
  );
}

function getPortfolioHeading(cvData: CVData): { name: string; title: string } {
  return {
    name: cvData.personal?.name ?? "Portfolio sin nombre",
    title: cvData.personal?.title ?? "Sin titular profesional",
  };
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "WP";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    portfolioId?: string;
    new?: string;
    billing?: string;
    plan?: string;
    session_id?: string;
    limit?: string;
    from?: string;
  }>;
}) {
  const supabase = await createClient();
  const locale = await getServerLocale();
  const isEn = locale === "en";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const billingSuccess = params.billing === "success";
  const billingCancelled = params.billing === "cancelled";
  const billingPlanLabel = params.plan === "studio" ? "Studio" : "Pro";
  const generationLimitReached =
    params.limit === "generation" && params.from === "upload";
  const expectedPlanFromBilling =
    params.plan === "studio"
      ? "studio"
      : params.plan === "publish"
        ? "premium"
        : null;

  if (billingSuccess && params.session_id) {
    await confirmStripeCheckoutForUser({
      userId: user.id,
      sessionId: params.session_id,
    });
  } else if (billingSuccess && expectedPlanFromBilling) {
    await confirmLatestStripeCheckoutForUser({
      userId: user.id,
      expectedPlan: expectedPlanFromBilling,
    });
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("username, plan")
    .eq("id", user.id)
    .single();
  const profile =
    (profileRaw as { username?: string; plan?: ProfilePlan } | null) ?? null;
  const profileUsername = profile?.username ?? null;
  const profilePlan = resolvePlan(profile?.plan);
  const planLimits = getPlanLimits(profilePlan);

  const { data: portfoliosRaw } = await supabase
    .from("portfolios")
    .select(
      "id, cv_data, theme, is_published, is_public, created_at, updated_at, published_at, version"
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const portfolios = (portfoliosRaw as DashboardPortfolioRow[] | null) ?? [];
  const isNew = params.new === "true";

  const selectedPortfolio =
    portfolios.find((portfolio) => portfolio.id === params.portfolioId) ?? portfolios[0];
  const greetingName =
    selectedPortfolio?.cv_data.personal?.name?.split(" ")[0] ||
    profileUsername ||
    user.user_metadata?.full_name?.split(" ")?.[0] ||
    user.email?.split("@")?.[0] ||
    "usuario";

  const billingEnforced = isBillingEnforcementEnabled();
  const billingMockEnabled = isBillingMockPaymentsEnabled();
  const selectedAccess = getFreePreviewAccess({
    plan: profilePlan,
    portfolioUpdatedAt: selectedPortfolio?.updated_at ?? null,
  });
  const freeExpiresAtLabel = formatExpirationDate(selectedAccess.expiresAt);
  const canAccessInteractive = !selectedAccess.isExpired;
  const canAccessPublic = selectedAccess.isPremium;
  const blockedByExpiry = selectedAccess.isFreePlan && selectedAccess.isExpired;
  const billingHref = selectedPortfolio
    ? `/dashboard/billing?portfolioId=${selectedPortfolio.id}`
    : "/dashboard/billing";
  const subdomainPortfolioHref = profileUsername
    ? buildPublicPortfolioUrl(profileUsername.toLowerCase())
    : null;
  const publicPortfolioHref =
    profileUsername && canAccessPublic
      ? subdomainPortfolioHref ?? `/p/${profileUsername}`
      : billingHref;
  const freeExpiresAtIso = selectedAccess.expiresAt
    ? selectedAccess.expiresAt.toISOString()
    : null;

  const selectedIterationsUsed = Math.max(
    0,
    (selectedPortfolio?.version ?? 1) - 1
  );
  const chatIterationsPerPortfolio = planLimits.chatIterationLimitPerPortfolio ?? 0;
  const canUseIterationChat = chatIterationsPerPortfolio > 0;
  const hasProAccess = profilePlan === "premium" || profilePlan === "studio";
  const hasStudioAccess = profilePlan === "studio";
  const isFreePlan = profilePlan === "free";
  const subscriptionStatus =
    !isFreePlan && !billingMockEnabled
      ? await getUserBillingSubscriptionStatus(user.id)
      : null;
  const hasScheduledCancellation = Boolean(
    subscriptionStatus?.cancelAtPeriodEnd && subscriptionStatus.currentPeriodEnd
  );
  const subscriptionEndsAtLabel = formatBillingDateTime(
    subscriptionStatus?.currentPeriodEnd ?? null,
    locale
  );
  const hasScheduledDowngradeToPro = Boolean(
    hasStudioAccess &&
      subscriptionStatus?.scheduledPlan === "premium" &&
      subscriptionStatus.scheduledChangeAt
  );
  const scheduledDowngradeAtLabel = formatBillingDateTime(
    subscriptionStatus?.scheduledChangeAt ?? null,
    locale
  );
  const billingApplied =
    expectedPlanFromBilling === "studio"
      ? hasStudioAccess
      : expectedPlanFromBilling === "premium"
        ? hasProAccess
        : false;
  const isUpgradeFromPro = profilePlan === "premium";
  const studioBillingHref = selectedPortfolio
    ? `/dashboard/billing?portfolioId=${selectedPortfolio.id}&plan=studio`
    : "/dashboard/billing?plan=studio";
  const studioUpgradePriceLabel = formatEuro(STUDIO_UPGRADE_FROM_PRO_EUR, locale);
  const studioOriginalPriceLabel = formatEuro(STUDIO_PRICE_EUR, locale);
  const currentPlanLabel = hasStudioAccess ? "Studio" : hasProAccess ? "Pro" : isEn ? "Free" : "Gratis";
  const currentPlanDescription = hasStudioAccess
    ? isEn
      ? "3 portfolios and 3 chat iterations per portfolio."
      : "3 portfolios y 3 iteraciones por portfolio con chat IA."
    : hasProAccess
      ? isEn
        ? "1 portfolio with subdomain for 1 year."
        : "1 portfolio con subdominio durante 1 año."
      : isEn
        ? "1 portfolio in preview for 24h. No public subdomain."
        : "1 portfolio en preview durante 24h. Sin subdominio público.";
  const currentPlanPriceLabel = hasStudioAccess
    ? isEn
      ? "24.99 €/year"
      : "24,99 €/año"
    : hasProAccess
      ? isEn
        ? "9.99 €/year"
        : "9,99 €/año"
      : isEn
        ? "€0"
        : "0 €";

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="border-b border-[var(--sand)] bg-[var(--paper)] sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-3 sm:py-4 flex flex-wrap items-center gap-2.5 sm:gap-4">
          <Link
            href="/"
            className="self-start font-display text-lg sm:text-xl font-semibold text-[var(--ink)] tracking-tight no-underline"
          >
            web<span className="text-[var(--rust)]">iculum</span>
          </Link>

          <div className="flex basis-full sm:basis-auto sm:ml-auto min-w-0 flex-wrap sm:flex-nowrap items-center justify-start sm:justify-end gap-1.5 sm:gap-2 text-xs sm:text-sm">
            {selectedPortfolio && canAccessInteractive && (
              <Link
                href={`/dashboard/preview?portfolioId=${selectedPortfolio.id}`}
                aria-label={isEn ? "Full view" : "Vista completa"}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1.5 md:px-2.5 md:py-2 text-[11px] md:text-xs xl:text-sm text-[var(--muted-color)] font-medium hover:bg-white hover:text-[var(--ink)] transition-colors no-underline"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{isEn ? "Full view" : "Vista completa"}</span>
                <span className="hidden sm:inline xl:hidden">{isEn ? "View" : "Vista"}</span>
              </Link>
            )}

            {selectedPortfolio && canAccessInteractive && (
              <span className="hidden xl:block h-5 w-px bg-[var(--sand)] shrink-0" aria-hidden="true" />
            )}

            {selectedPortfolio && canAccessPublic && (
              <a
                href={`/api/portfolio/download-html?portfolioId=${selectedPortfolio.id}`}
                aria-label={isEn ? "Download HTML" : "Descargar HTML"}
                className="inline-flex shrink-0 items-center gap-1.5 px-2.5 md:px-3 xl:px-4 py-1.5 md:py-2 rounded-xl xl:rounded-2xl bg-white text-[var(--ink)] border border-[var(--sand)] text-[11px] md:text-xs xl:text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all no-underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{isEn ? "Download HTML" : "Descargar HTML"}</span>
                <span className="hidden sm:inline xl:hidden">HTML</span>
              </a>
            )}

            {selectedPortfolio && profileUsername && (
              <PublicPortfolioButton
                canAccessPublic={canAccessPublic}
                portfolioId={selectedPortfolio.id}
                billingHref={billingHref}
                publicUrl={publicPortfolioHref}
                className="inline-flex shrink-0 items-center gap-1.5 px-2.5 md:px-3 xl:px-4 py-1.5 md:py-2 rounded-xl xl:rounded-2xl bg-white text-[var(--ink)] border border-[var(--sand)] text-[11px] md:text-xs xl:text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all"
              />
            )}

            <LocaleToggle
              locale={locale}
              className="inline-flex shrink-0 items-center rounded-xl xl:rounded-2xl border border-[var(--sand)] bg-white p-0.5 xl:p-1"
            />

            <Link
              href="/ayuda"
              aria-label={isEn ? "Help" : "Ayuda"}
              className="inline-flex shrink-0 items-center gap-1.5 px-2.5 md:px-3 xl:px-4 py-1.5 md:py-2 rounded-xl xl:rounded-2xl bg-white text-[var(--ink)] border border-[var(--sand)] text-[11px] md:text-xs xl:text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all no-underline"
            >
              <CircleHelp className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{isEn ? "Help" : "Ayuda"}</span>
            </Link>

            <Link
              href="/upload"
              aria-label={isEn ? "Create new portfolio" : "Crear nuevo portfolio"}
              className="inline-flex shrink-0 items-center gap-1.5 px-2.5 md:px-3 xl:px-4 py-1.5 md:py-2 rounded-xl xl:rounded-2xl bg-[var(--rust)] text-white border border-[var(--rust)] text-[11px] md:text-xs xl:text-sm font-medium hover:bg-[var(--rust-light)] hover:border-[var(--rust-light)] transition-all no-underline"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">
                {isEn ? "Create new portfolio" : "Crear nuevo portfolio"}
              </span>
              <span className="hidden sm:inline xl:hidden">{isEn ? "New" : "Nuevo"}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {!billingEnforced && (
          <div className="rounded-lg border border-[rgba(192,68,10,0.2)] bg-[rgba(192,68,10,0.06)] p-3 text-sm text-[var(--rust)]">
            <strong>{isEn ? "Open beta mode:" : "Modo beta abierto:"}</strong>{" "}
            {isEn
              ? "right now all accounts can create and edit portfolios even if payments are not connected yet. The billing screens are already prepared."
              : "ahora mismo todas las cuentas pueden crear y editar portfolios aunque el pago no esté conectado. Las pantallas de cobro ya están preparadas."}
          </div>
        )}

        {billingSuccess && (
          <div className="rounded-lg border border-[rgba(10,125,70,0.22)] bg-[rgba(10,125,70,0.08)] p-3 text-sm text-[rgb(10,125,70)]">
            {billingApplied ? (
              <>
                <strong>{isEn ? `Plan activated (${billingPlanLabel}).` : `Plan activado (${billingPlanLabel}).`}</strong>{" "}
                {isEn ? "You already have access to this plan’s features." : "Ya tienes acceso a las funciones de este plan."}
              </>
            ) : (
              <>
                <strong>{isEn ? `Payment confirmed (${billingPlanLabel}).` : `Pago confirmado (${billingPlanLabel}).`}</strong>{" "}
                {isEn
                  ? "We are syncing activation; reload in a few seconds if it does not update automatically."
                  : "Estamos sincronizando la activación; recarga en unos segundos si no se actualiza automáticamente."}
              </>
            )}
          </div>
        )}

        {billingCancelled && (
          <div className="rounded-lg border border-[rgba(192,68,10,0.2)] bg-[rgba(192,68,10,0.06)] p-3 text-sm text-[var(--rust)]">
            <strong>{isEn ? "Payment cancelled." : "Pago cancelado."}</strong>{" "}
            {isEn ? "You can keep using the platform in open beta mode." : "Puedes seguir usando la plataforma en modo beta abierto."}
          </div>
        )}

        {generationLimitReached && (
          <div className="rounded-lg border border-[rgba(192,68,10,0.2)] bg-[rgba(192,68,10,0.06)] p-3 text-sm text-[var(--rust)]">
            <strong>{isEn ? "Site limit reached for your plan." : "Límite de webs alcanzado para tu plan."}</strong>{" "}
            {profilePlan === "studio"
              ? isEn
                ? "You already have 3 portfolios."
                : "Ya tienes 3 portfolios."
              : isEn
                ? "To create more, you need to activate Studio (24.99 €)."
                : "Para crear más necesitas activar Studio (€24,99)."}
          </div>
        )}

        {portfolios.length > 0 ? (
          <>
            {isNew && (
              <div className="rounded-lg border border-[rgba(192,68,10,0.2)] bg-[rgba(192,68,10,0.06)] p-3 text-sm text-[var(--rust)]">
                <strong>{isEn ? "Portfolio generated!" : "¡Portfolio generado!"}</strong>{" "}
                {isEn ? "It has been added to your portfolio library." : "Se ha añadido a tu biblioteca de portfolios."}
                {profileUsername && (
                  <>
                    {" "}
                    {hasProAccess ? (
                      <>
                        {isEn ? "You can publish it now at " : "Puedes publicarlo ahora en "}
                        <span className="font-mono">
                          {buildPublicPortfolioUrl(profileUsername.toLowerCase())}
                        </span>
                        .
                      </>
                    ) : (
                      <>
                        {isEn ? "If you activate a paid plan, it will be published at " : "Si activas pago, se publicará en "}
                        <span className="font-mono">
                          {buildPublicPortfolioUrl(profileUsername.toLowerCase())}
                        </span>
                        .
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
              <div className="space-y-6 min-w-0">
                <section className="min-w-0">
                  <div className="flex flex-col gap-4 border-b border-[var(--sand)] pb-5 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                      <h1 className="font-display text-[clamp(1.9rem,3vw,2.7rem)] tracking-tight text-[var(--ink)] leading-none">
                        {isEn ? "Hi, " : "Hola, "}<span className="text-[var(--rust)]">{greetingName}</span>
                      </h1>
                      <p className="mt-2 text-sm text-[var(--muted-color)]">
                        {isEn ? "Manage your portfolios and publish your professional profile." : "Gestiona tus portfolios y publica tu perfil profesional."}
                      </p>
                    </div>
                    <LogoutButton
                      label={isEn ? "Log out" : "Salir"}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors"
                    />
                  </div>
                </section>

                <section className="space-y-4 min-w-0">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="font-display text-[2rem] text-[var(--ink)] tracking-tight">
                        {isEn ? "My portfolios" : "Mis portfolios"}
                      </h2>
                      <span className="rounded-full bg-[var(--cream)] px-3 py-1 text-[0.75rem] text-[var(--muted-color)]">
                        {portfolios.length} /{" "}
                        {planLimits.generationLimit === null ? "∞" : planLimits.generationLimit}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--muted-color)]">
                      {isEn ? "Select one to edit." : "Selecciona uno para editar."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {portfolios.map((portfolio) => {
                      const heading = getPortfolioHeading(portfolio.cv_data);
                      const isSelected = selectedPortfolio?.id === portfolio.id;
                      return (
                        <article
                          key={portfolio.id}
                          className={`relative min-w-0 rounded-[18px] border bg-white p-4 transition-all cursor-pointer flex h-full flex-col ${
                            isSelected
                              ? "border-[var(--rust)] shadow-[0_12px_28px_rgba(192,68,10,0.08)]"
                              : "border-[var(--sand)] hover:border-[var(--ink)]"
                          }`}
                        >
                          <Link
                            href={`/dashboard?portfolioId=${portfolio.id}`}
                            className="absolute inset-0 z-10 rounded-[18px]"
                            aria-label={
                              isEn
                                ? `Select ${heading.name}'s portfolio`
                                : `Seleccionar portfolio de ${heading.name}`
                            }
                          />

                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[0.68rem] text-[var(--muted-color)] font-medium uppercase tracking-[0.14em]">
                              {getThemeName(portfolio.theme)}
                            </p>
                            {isSelected && (
                              <span className="rounded-lg bg-[var(--rust)] px-2.5 py-1 text-[0.68rem] text-white font-medium uppercase tracking-[0.08em]">
                                {isEn ? "Active" : "Activo"}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cream)] font-display text-[1.05rem] text-[var(--ink)]">
                            {getInitials(heading.name)}
                          </div>

                          <h3 className="mt-4 font-display text-[1.05rem] leading-[1.08] text-[var(--ink)] tracking-tight text-balance">
                            {heading.name}
                          </h3>
                          <p className="mt-1 text-sm text-[var(--muted-color)] line-clamp-2 break-words">
                            {heading.title}
                          </p>

                          <div className="mt-auto border-t border-[var(--sand)] pt-3">
                            <p className="text-[0.72rem] uppercase tracking-[0.1em] text-[var(--muted-color)]">
                              {isEn ? "Select portfolio" : "Seleccionar portfolio"}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                {canUseIterationChat ? (
                  <PortfolioIterationChat
                    key={selectedPortfolio.id}
                    portfolioId={selectedPortfolio.id}
                    iterationsUsed={selectedIterationsUsed}
                    iterationsLimit={planLimits.chatIterationLimitPerPortfolio}
                    billingEnforced={billingEnforced}
                  />
                ) : (
                  <section className="border border-[var(--sand)] rounded-xl bg-white p-4 md:p-5">
                    <p className="text-xs uppercase tracking-[0.1em] text-[var(--rust)] font-medium mb-2">
                      {isEn ? "AI iterations" : "Iteraciones con IA"}
                    </p>
                    <p className="text-sm text-[var(--ink)]">
                      {isEn ? "This plan does not include iteration chat." : "Este plan no incluye chat de iteración."}
                    </p>
                    <p className="text-xs text-[var(--muted-color)] mt-1">
                      {isEn
                        ? "Available in Studio (24.99 €) with up to 3 iterations per portfolio."
                        : "Disponible en Studio (€24,99) con hasta 3 iteraciones por portfolio."}
                    </p>
                    <div className="mt-4">
                      <Link
                        href={studioBillingHref}
                        className="inline-flex items-center justify-center rounded border border-[var(--sand)] bg-white text-[var(--ink)] px-3 py-2 text-xs font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-colors no-underline"
                      >
                        {isEn ? "Choose Studio plan" : "Elegir plan Studio"}
                      </Link>
                    </div>
                  </section>
                )}
              </div>

              <aside className="space-y-5">
                <section className="border border-[var(--sand)] rounded-xl bg-white p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.1em] text-[var(--rust)] font-medium">
                        {isEn ? "Current plan" : "Plan actual"}
                      </p>
                      <h2 className="mt-1 font-display text-[1.2rem] text-[var(--ink)] tracking-tight">
                        {currentPlanLabel}
                      </h2>
                    </div>
                    <span
                      className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-medium ${
                        hasScheduledCancellation
                          ? "bg-[rgba(192,68,10,0.12)] text-[var(--rust)]"
                          : "bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)]"
                      }`}
                    >
                      {hasScheduledCancellation
                        ? isEn
                          ? "Cancels"
                          : "Cancelada"
                        : isEn
                          ? "Active"
                          : "Activo"}
                    </span>
                  </div>

                  <p className="mt-3 font-display text-[1.4rem] leading-none text-[var(--ink)]">
                    {currentPlanPriceLabel}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted-color)]">
                    {currentPlanDescription}
                  </p>

                  {isFreePlan && (
                    <div className="mt-4 rounded-lg border border-[rgba(192,68,10,0.18)] bg-[rgba(192,68,10,0.05)] p-3">
                      <p className="text-[0.72rem] uppercase tracking-[0.1em] text-[var(--rust)] font-medium">
                        {isEn ? "Upgrade plan" : "Mejorar plan"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-color)]">
                        {isEn
                          ? "Activate Pro to publish your portfolio and use a subdomain."
                          : "Activa Pro para publicar tu portfolio y usar subdominio."}
                      </p>
                      <div className="mt-3">
                        <Link
                          href={billingHref}
                          className="inline-flex items-center justify-center rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-medium text-[var(--paper)] hover:bg-[var(--rust)] transition-colors no-underline"
                        >
                          {isEn ? "Choose Pro" : "Elegir Pro"}
                        </Link>
                      </div>
                    </div>
                  )}

                  {!isFreePlan && !billingMockEnabled && (
                    <div className="mt-4">
                      <ManageSubscriptionButton className="inline-flex w-full items-center justify-center rounded-lg border border-[var(--sand)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-colors">
                        {isEn ? "Manage subscription" : "Gestionar suscripción"}
                      </ManageSubscriptionButton>
                      {hasStudioAccess && (
                        <>
                          <DowngradeToProButton className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-[var(--sand)] bg-[var(--cream)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] hover:bg-white transition-colors">
                            {isEn
                              ? "Downgrade to Pro at renewal"
                              : "Bajar a Pro en la renovación"}
                          </DowngradeToProButton>
                          <p className="mt-3 text-xs leading-5 text-[var(--muted-color)]">
                            {isEn
                              ? "Use this when you already have the site you want and only need to keep one public site active each year."
                              : "Úsalo si ya tienes la web que quieres y solo necesitas mantener una única web pública activa cada año."}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {hasScheduledCancellation && subscriptionEndsAtLabel && (
                    <p className="mt-3 text-xs leading-5 text-[var(--rust)]">
                      {isEn
                        ? `This subscription is set to end on ${subscriptionEndsAtLabel}. Your public domain will stop being active on that date unless the subscription is resumed before then.`
                        : `Esta suscripción terminará el ${subscriptionEndsAtLabel}. Tu dominio público dejará de estar activo en esa fecha si no se reactiva antes.`}
                    </p>
                  )}
                  {hasScheduledDowngradeToPro && scheduledDowngradeAtLabel && (
                    <p className="mt-3 text-xs leading-5 text-[var(--rust)]">
                      {isEn
                        ? `Studio stays active until ${scheduledDowngradeAtLabel}. From that date your plan will continue as Pro, and the site currently linked to your domain will remain as the published site.`
                        : `Studio seguirá activo hasta el ${scheduledDowngradeAtLabel}. A partir de esa fecha tu plan pasará a Pro y la web que esté enlazada en ese momento a tu dominio se mantendrá como web publicada.`}
                    </p>
                  )}
                </section>

                {canAccessPublic && profileUsername && subdomainPortfolioHref && (
                  <PublicSubdomainSettings
                    currentSlug={profileUsername.toLowerCase()}
                    publicUrl={subdomainPortfolioHref}
                  />
                )}

                {selectedPortfolio && profileUsername && subdomainPortfolioHref && (
                  <LinkSubdomainButton
                    canAccessPublic={canAccessPublic}
                    portfolioId={selectedPortfolio.id}
                    billingHref={billingHref}
                    publicUrl={subdomainPortfolioHref}
                    className="h-11 w-full rounded-lg border border-[var(--sand)] bg-white text-[var(--ink)] text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  />
                )}
              </aside>
            </div>

            {selectedPortfolio && selectedAccess.isFreePlan && (
              <div
                className={`rounded-lg border p-3 text-sm text-[var(--rust)] ${
                  selectedAccess.isExpired
                    ? "bg-[rgba(192,68,10,0.09)] border-[rgba(192,68,10,0.25)]"
                    : "bg-[rgba(192,68,10,0.06)] border-[rgba(192,68,10,0.18)]"
                }`}
              >
                <Clock3 className="w-4 h-4 inline mr-1.5" />
                {selectedAccess.isExpired ? (
                  <>
                    <strong>{isEn ? "Preview expired (24h)." : "Preview expirada (24h)."}</strong>{" "}
                    {isEn ? "Deadline:" : "Fecha límite:"}{" "}
                    {freeExpiresAtLabel}.
                  </>
                ) : (
                  <>
                    <strong>{isEn ? "Free preview active." : "Preview gratis activa."}</strong>{" "}
                    {isEn ? "Expires on" : "Caduca el"}{" "}
                    <strong>{freeExpiresAtLabel}</strong>{" "}
                    {freeExpiresAtIso && (
                      <>
                        <span className="mx-1">·</span>
                        <FreePreviewCountdown expiresAtIso={freeExpiresAtIso} />
                      </>
                    )}{" "}
                    {isEn ? "if no plan is activated." : "si no se activa plan."}
                  </>
                )}
              </div>
            )}

            {!blockedByExpiry ? (
              <>
                <div className="flex items-center gap-2 text-sm text-[var(--muted-color)]">
                  <Eye className="w-4 h-4" />
                  {isEn ? "Preview of the selected portfolio" : "Vista previa del portfolio seleccionado"}
                </div>

                <div className="border border-[var(--sand)] rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                  <PortfolioRenderer
                    cvData={selectedPortfolio.cv_data}
                    showBranding={true}
                    interactiveGeneratedLanding={false}
                    locale={locale}
                  />
                </div>
              </>
            ) : (
              <div className="max-w-3xl mx-auto py-10 text-center">
                <h2 className="font-display text-[1.8rem] text-[var(--ink)] tracking-tight">
                  {isEn ? "Your free preview has expired" : "Tu preview gratuita ha expirado"}
                </h2>
                <p className="text-[var(--muted-color)] mt-3 leading-relaxed">
                  {isEn ? "Activate a plan to publish with a subdomain and keep the site." : "Activa un plan para publicar con subdominio y conservar la web."}
                </p>
                <div className="mt-6 inline-block">
                  <Link
                    href={billingHref}
                    className="inline-flex items-center gap-2 bg-[var(--ink)] text-[var(--paper)] px-6 py-3 rounded text-sm font-medium hover:bg-[var(--rust)] transition-colors no-underline"
                  >
                    <Lock className="w-4 h-4" />
                    {isEn ? "Activate plan (9.99 €)" : "Activar plan (€9,99)"}
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--cream)] flex items-center justify-center mb-6">
              <Upload className="w-7 h-7 text-[var(--muted-color)]" />
            </div>
            <h2 className="font-display text-[1.5rem] font-light tracking-tight text-[var(--ink)] mb-2">
              {isEn ? "You don’t have any portfolios yet" : "Aún no tienes portfolios"}
            </h2>
            <p className="text-[var(--muted-color)] text-sm mb-6 max-w-md font-light">
              {isEn
                ? "Upload your CV to create the first one. Right now you can generate multiple portfolios in open beta mode."
                : "Sube tu CV para crear el primero. Ahora mismo puedes generar varios portfolios en modo beta abierto."}
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-[var(--ink)] text-[var(--paper)] px-6 py-3 rounded text-sm font-medium hover:bg-[var(--rust)] transition-colors no-underline"
            >
              <Upload className="w-4 h-4" />
              {isEn ? "Upload CV" : "Subir CV"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
