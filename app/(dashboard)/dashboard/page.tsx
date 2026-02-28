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
  Layers3,
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

function formatDate(dateInput: string | null | undefined): string {
  if (!dateInput) return "Sin fecha";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="border-b border-[var(--sand)] bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-[var(--ink)] tracking-tight no-underline"
          >
            web<span className="text-[var(--rust)]">iculum</span>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--sand)] text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all no-underline"
            >
              <Upload className="w-3.5 h-3.5" />
              Crear nuevo portfolio
            </Link>

            <LogoutButton label="Salir" />

            {selectedPortfolio && canAccessInteractive && (
              <Link
                href={`/dashboard/preview?portfolioId=${selectedPortfolio.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-white text-[var(--ink)] border border-[var(--sand)] text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all no-underline"
              >
                <Monitor className="w-3.5 h-3.5" />
                Vista completa
              </Link>
            )}

            {selectedPortfolio && profileUsername && (
              <PublicPortfolioButton
                canAccessPublic={canAccessPublic}
                portfolioId={selectedPortfolio.id}
                billingHref={billingHref}
                publicUrl={publicPortfolioHref}
              />
            )}

            {selectedPortfolio && canAccessPublic && (
              <a
                href={`/api/portfolio/download-html?portfolioId=${selectedPortfolio.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-white text-[var(--ink)] border border-[var(--sand)] text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all no-underline"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar HTML
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
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

        <section className="border border-[var(--sand)] rounded-xl bg-white p-4 md:p-5">
          <div className="flex items-center gap-2 text-sm text-[var(--ink)] mb-4">
            <Layers3 className="w-4 h-4 text-[var(--rust)]" />
            <strong>Planes y límites configurados</strong>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[var(--sand)] bg-[var(--paper)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--rust)] font-medium">
                  Gratis
                </p>
                {isFreePlan && (
                  <span className="text-[0.65rem] px-2 py-1 rounded bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)] uppercase tracking-[0.08em] font-medium">
                    Activo
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--ink)]">
                1 portfolio en preview durante 24h.
              </p>
              <p className="mt-1 text-xs text-[var(--muted-color)]">
                Sin subdominio público.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--sand)] bg-[var(--paper)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--rust)] font-medium">
                  Pro · €9,99
                </p>
                {hasProAccess && (
                  <span className="text-[0.65rem] px-2 py-1 rounded bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)] uppercase tracking-[0.08em] font-medium">
                    Activo
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--ink)]">
                1 portfolio con subdominio durante 1 año.
              </p>
              {hasProAccess ? (
                <button
                  type="button"
                  disabled
                  className="mt-3 w-full rounded bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)] px-3 py-2 text-xs font-medium cursor-not-allowed"
                >
                  {hasStudioAccess ? "Incluido en Studio" : "Plan Pro activo"}
                </button>
              ) : (
                <Link
                  href={billingHref}
                  className="mt-3 w-full rounded bg-[var(--ink)] text-[var(--paper)] px-3 py-2 text-xs font-medium hover:bg-[var(--rust)] transition-colors no-underline inline-flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Elegir plan Pro
                </Link>
              )}
            </div>

            <div className="rounded-lg border border-[var(--sand)] bg-[var(--paper)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--rust)] font-medium">
                  {isUpgradeFromPro ? (
                    <>
                      Studio ·{" "}
                      <span className="line-through opacity-75">
                        {studioOriginalPriceLabel}
                      </span>{" "}
                      <span className="text-[rgb(10,125,70)] font-semibold no-underline">
                        {studioUpgradePriceLabel}
                      </span>
                    </>
                  ) : (
                    "Studio · €24,99"
                  )}
                </p>
                {hasStudioAccess && (
                  <span className="text-[0.65rem] px-2 py-1 rounded bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)] uppercase tracking-[0.08em] font-medium">
                    Activo
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--ink)]">
                3 portfolios y 3 iteraciones por portfolio con chat.
              </p>
              {isUpgradeFromPro && !hasStudioAccess && (
                <p className="mt-1 text-xs text-[rgb(10,125,70)]">
                  Upgrade desde Pro: descuento de €9,99 aplicado.
                </p>
              )}
              {hasStudioAccess ? (
                <button
                  type="button"
                  disabled
                  className="mt-3 w-full rounded bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)] px-3 py-2 text-xs font-medium cursor-not-allowed"
                >
                  Plan Studio activo
                </button>
              ) : (
                <Link
                  href={studioBillingHref}
                  className="mt-3 w-full rounded border border-[var(--sand)] bg-white text-[var(--ink)] px-3 py-2 text-xs font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-colors no-underline inline-flex items-center justify-center"
                >
                  {isUpgradeFromPro
                    ? `Mejorar a Studio por ${studioUpgradePriceLabel}`
                    : "Elegir Studio"}
                </Link>
              )}
            </div>
          </div>
        </section>

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

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[1.35rem] text-[var(--ink)] tracking-tight">
                  Mis portfolios ({portfolios.length})
                </h2>
                <p className="text-xs text-[var(--muted-color)]">
                  Selecciona uno para ver preview y editar por chat.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {portfolios.map((portfolio) => {
                  const heading = getPortfolioHeading(portfolio.cv_data);
                  const isSelected = selectedPortfolio?.id === portfolio.id;
                  return (
                    <article
                      key={portfolio.id}
                      className={`relative rounded-lg border p-4 transition-colors cursor-pointer ${
                        isSelected
                          ? "border-[var(--ink)] bg-white"
                          : "border-[var(--sand)] bg-white/80 hover:border-[var(--ink)]"
                      }`}
                    >
                      <Link
                        href={`/dashboard?portfolioId=${portfolio.id}`}
                        className="absolute inset-0 z-10 rounded-lg"
                        aria-label={`Seleccionar portfolio de ${heading.name}`}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-[var(--rust)] font-medium uppercase tracking-[0.08em]">
                          {getThemeName(portfolio.theme)}
                        </p>
                        {isSelected && (
                          <span className="text-[0.68rem] px-2 py-1 rounded bg-[var(--ink)] text-[var(--paper)]">
                            Seleccionado
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 font-display text-[1rem] text-[var(--ink)] tracking-tight">
                        {heading.name}
                      </h3>
                      <p className="text-sm text-[var(--muted-color)] line-clamp-2">
                        {heading.title}
                      </p>

                      <p className="mt-3 text-[0.72rem] text-[var(--muted-color)]">
                        Actualizado: {formatDate(portfolio.updated_at)}
                      </p>

                      <div className="relative z-20 mt-3 flex items-center gap-2">
                        <Link
                          href={`/dashboard?portfolioId=${portfolio.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink)] hover:text-[var(--rust)] no-underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver
                        </Link>
                        <Link
                          href={`/dashboard/preview?portfolioId=${portfolio.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted-color)] hover:text-[var(--ink)] no-underline"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          Interactiva
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

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
                  />
                )}

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
