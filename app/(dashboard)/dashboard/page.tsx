import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortfolioRenderer } from "@/components/portfolio/portfolio-renderer";
import { PortfolioIterationChat } from "@/components/dashboard/portfolio-iteration-chat";
import { PublicPortfolioButton } from "@/components/dashboard/public-portfolio-button";
import { PublicSubdomainSettings } from "@/components/dashboard/public-subdomain-settings";
import { LinkSubdomainButton } from "@/components/dashboard/link-subdomain-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { FreePreviewCountdown } from "@/components/dashboard/free-preview-countdown";
import {
  Upload,
  Eye,
  Monitor,
  Lock,
  Clock3,
  Download,
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
import { isBillingEnforcementEnabled } from "@/lib/billing/config";
import { PORTFOLIO_THEME_OPTIONS } from "@/lib/templates/portfolio-themes";
import { buildPublicPortfolioUrl } from "@/lib/billing/activation";
import {
  confirmLatestStripeCheckoutForUser,
  confirmStripeCheckoutForUser,
} from "@/lib/billing/stripe-confirmation";

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
  const billingApplied =
    expectedPlanFromBilling === "studio"
      ? hasStudioAccess
      : expectedPlanFromBilling === "premium"
        ? hasProAccess
        : false;
  const isUpgradeFromPro = profilePlan === "premium";
  const isFreePlan = profilePlan === "free";
  const studioBillingHref = selectedPortfolio
    ? `/dashboard/billing?portfolioId=${selectedPortfolio.id}&plan=studio`
    : "/dashboard/billing?plan=studio";
  const studioUpgradePriceLabel = formatEuro(STUDIO_UPGRADE_FROM_PRO_EUR);
  const studioOriginalPriceLabel = formatEuro(STUDIO_PRICE_EUR);
  const currentPlanLabel = hasStudioAccess ? "Studio" : hasProAccess ? "Pro" : "Gratis";
  const currentPlanDescription = hasStudioAccess
    ? "3 portfolios y 3 iteraciones por portfolio con chat IA."
    : hasProAccess
      ? "1 portfolio con subdominio durante 1 año."
      : "1 portfolio en preview durante 24h. Sin subdominio público.";
  const currentPlanPriceLabel = hasStudioAccess
    ? "€24,99/año"
    : hasProAccess
      ? "€9,99/año"
      : "€0";

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="border-b border-[var(--sand)] bg-[var(--paper)] sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-4 flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="self-start font-display text-xl font-semibold text-[var(--ink)] tracking-tight no-underline"
          >
            web<span className="text-[var(--rust)]">iculum</span>
          </Link>

          <div className="ml-auto min-w-0 flex flex-nowrap items-center justify-end gap-1.5 sm:gap-2 overflow-x-auto text-xs sm:text-sm">
            {selectedPortfolio && canAccessInteractive && (
              <Link
                href={`/dashboard/preview?portfolioId=${selectedPortfolio.id}`}
                className="inline-flex shrink-0 items-center gap-1.5 px-2 py-2 text-[var(--muted-color)] font-medium hover:text-[var(--ink)] transition-colors no-underline"
              >
                <Monitor className="w-3.5 h-3.5" />
                Vista completa
              </Link>
            )}

            {selectedPortfolio && canAccessInteractive && (
              <span className="hidden md:block h-5 w-px bg-[var(--sand)] shrink-0" aria-hidden="true" />
            )}

            {selectedPortfolio && canAccessPublic && (
              <a
                href={`/api/portfolio/download-html?portfolioId=${selectedPortfolio.id}`}
                className="inline-flex shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl bg-white text-[var(--ink)] border border-[var(--sand)] text-xs sm:text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all no-underline"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar HTML
              </a>
            )}

            {selectedPortfolio && profileUsername && (
              <PublicPortfolioButton
                canAccessPublic={canAccessPublic}
                portfolioId={selectedPortfolio.id}
                billingHref={billingHref}
                publicUrl={publicPortfolioHref}
                className="inline-flex shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl bg-white text-[var(--ink)] border border-[var(--sand)] text-xs sm:text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all"
              />
            )}

            <Link
              href="/upload"
              className="inline-flex shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl bg-[var(--rust)] text-white border border-[var(--rust)] text-xs sm:text-sm font-medium hover:bg-[var(--rust-light)] hover:border-[var(--rust-light)] transition-all no-underline"
            >
              <Upload className="w-3.5 h-3.5" />
              Crear nuevo portfolio
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {!billingEnforced && (
          <div className="rounded-lg border border-[rgba(192,68,10,0.2)] bg-[rgba(192,68,10,0.06)] p-3 text-sm text-[var(--rust)]">
            <strong>Modo beta abierto:</strong> ahora mismo todas las cuentas pueden
            crear y editar portfolios aunque el pago no esté conectado. Las pantallas
            de cobro ya están preparadas.
          </div>
        )}

        {billingSuccess && (
          <div className="rounded-lg border border-[rgba(10,125,70,0.22)] bg-[rgba(10,125,70,0.08)] p-3 text-sm text-[rgb(10,125,70)]">
            {billingApplied ? (
              <>
                <strong>Plan activado ({billingPlanLabel}).</strong> Ya tienes
                acceso a las funciones de este plan.
              </>
            ) : (
              <>
                <strong>Pago confirmado ({billingPlanLabel}).</strong> Estamos
                sincronizando la activación; recarga en unos segundos si no se
                actualiza automáticamente.
              </>
            )}
          </div>
        )}

        {billingCancelled && (
          <div className="rounded-lg border border-[rgba(192,68,10,0.2)] bg-[rgba(192,68,10,0.06)] p-3 text-sm text-[var(--rust)]">
            <strong>Pago cancelado.</strong> Puedes seguir usando la plataforma en modo
            beta abierto.
          </div>
        )}

        {generationLimitReached && (
          <div className="rounded-lg border border-[rgba(192,68,10,0.2)] bg-[rgba(192,68,10,0.06)] p-3 text-sm text-[var(--rust)]">
            <strong>Límite de webs alcanzado para tu plan.</strong>{" "}
            {profilePlan === "studio"
              ? "Ya tienes 3 portfolios."
              : "Para crear más necesitas activar Studio (€24,99)."}
          </div>
        )}

        {portfolios.length > 0 ? (
          <>
            {isNew && (
              <div className="rounded-lg border border-[rgba(192,68,10,0.2)] bg-[rgba(192,68,10,0.06)] p-3 text-sm text-[var(--rust)]">
                <strong>¡Portfolio generado!</strong> Se ha añadido a tu biblioteca de
                portfolios.
                {profileUsername && (
                  <>
                    {" "}
                    {hasProAccess ? (
                      <>
                        Puedes publicarlo ahora en{" "}
                        <span className="font-mono">
                          {buildPublicPortfolioUrl(profileUsername.toLowerCase())}
                        </span>
                        .
                      </>
                    ) : (
                      <>
                        Si activas pago, se publicará en{" "}
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
                        Hola, <span className="text-[var(--rust)]">{greetingName}</span>
                      </h1>
                      <p className="mt-2 text-sm text-[var(--muted-color)]">
                        Gestiona tus portfolios y publica tu perfil profesional.
                      </p>
                    </div>
                    <LogoutButton
                      label="Salir"
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors"
                    />
                  </div>
                </section>

                <section className="space-y-4 min-w-0">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="font-display text-[2rem] text-[var(--ink)] tracking-tight">
                        Mis portfolios
                      </h2>
                      <span className="rounded-full bg-[var(--cream)] px-3 py-1 text-[0.75rem] text-[var(--muted-color)]">
                        {portfolios.length} /{" "}
                        {planLimits.generationLimit === null ? "∞" : planLimits.generationLimit}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--muted-color)]">
                      Selecciona uno para editar.
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
                            aria-label={`Seleccionar portfolio de ${heading.name}`}
                          />

                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[0.68rem] text-[var(--muted-color)] font-medium uppercase tracking-[0.14em]">
                              {getThemeName(portfolio.theme)}
                            </p>
                            {isSelected && (
                              <span className="rounded-lg bg-[var(--rust)] px-2.5 py-1 text-[0.68rem] text-white font-medium uppercase tracking-[0.08em]">
                                Activo
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
                              Seleccionar portfolio
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
                      Iteraciones con IA
                    </p>
                    <p className="text-sm text-[var(--ink)]">
                      Este plan no incluye chat de iteración.
                    </p>
                    <p className="text-xs text-[var(--muted-color)] mt-1">
                      Disponible en Studio (€24,99) con hasta 3 iteraciones por
                      portfolio.
                    </p>
                    <div className="mt-4">
                      <Link
                        href={studioBillingHref}
                        className="inline-flex items-center justify-center rounded border border-[var(--sand)] bg-white text-[var(--ink)] px-3 py-2 text-xs font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-colors no-underline"
                      >
                        Elegir plan Studio
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
                        Plan actual
                      </p>
                      <h2 className="mt-1 font-display text-[1.2rem] text-[var(--ink)] tracking-tight">
                        {currentPlanLabel}
                      </h2>
                    </div>
                    <span className="inline-flex rounded-lg px-3 py-1.5 text-xs font-medium bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)]">
                      Activo
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
                        Mejorar plan
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-color)]">
                        Activa Pro para publicar tu portfolio y usar subdominio.
                      </p>
                      <div className="mt-3">
                        <Link
                          href={billingHref}
                          className="inline-flex items-center justify-center rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-medium text-[var(--paper)] hover:bg-[var(--rust)] transition-colors no-underline"
                        >
                          Elegir Pro
                        </Link>
                      </div>
                    </div>
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
                    <strong>Preview expirada (24h).</strong> Fecha límite:{" "}
                    {freeExpiresAtLabel}.
                  </>
                ) : (
                  <>
                    <strong>Preview gratis activa.</strong> Caduca el{" "}
                    <strong>{freeExpiresAtLabel}</strong>{" "}
                    {freeExpiresAtIso && (
                      <>
                        <span className="mx-1">·</span>
                        <FreePreviewCountdown expiresAtIso={freeExpiresAtIso} />
                      </>
                    )}{" "}
                    si no se activa plan.
                  </>
                )}
              </div>
            )}

            {!blockedByExpiry ? (
              <>
                <div className="flex items-center gap-2 text-sm text-[var(--muted-color)]">
                  <Eye className="w-4 h-4" />
                  Vista previa del portfolio seleccionado
                </div>

                <div className="border border-[var(--sand)] rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                  <PortfolioRenderer
                    cvData={selectedPortfolio.cv_data}
                    showBranding={true}
                    interactiveGeneratedLanding={false}
                  />
                </div>
              </>
            ) : (
              <div className="max-w-3xl mx-auto py-10 text-center">
                <h2 className="font-display text-[1.8rem] text-[var(--ink)] tracking-tight">
                  Tu preview gratuita ha expirado
                </h2>
                <p className="text-[var(--muted-color)] mt-3 leading-relaxed">
                  Activa un plan para publicar con subdominio y conservar la web.
                </p>
                <div className="mt-6 inline-block">
                  <Link
                    href={billingHref}
                    className="inline-flex items-center gap-2 bg-[var(--ink)] text-[var(--paper)] px-6 py-3 rounded text-sm font-medium hover:bg-[var(--rust)] transition-colors no-underline"
                  >
                    <Lock className="w-4 h-4" />
                    Activar plan (€9,99)
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
              Aún no tienes portfolios
            </h2>
            <p className="text-[var(--muted-color)] text-sm mb-6 max-w-md font-light">
              Sube tu CV para crear el primero. Ahora mismo puedes generar varios
              portfolios en modo beta abierto.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-[var(--ink)] text-[var(--paper)] px-6 py-3 rounded text-sm font-medium hover:bg-[var(--rust)] transition-colors no-underline"
            >
              <Upload className="w-4 h-4" />
              Subir CV
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
