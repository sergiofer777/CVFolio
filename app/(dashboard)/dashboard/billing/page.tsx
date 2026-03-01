import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Crown, Sparkles } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { getServerLocale } from "@/lib/locale-server";
import {
  isPaidPlan,
  resolvePlan,
  type ProfilePlan,
} from "@/lib/billing/access";
import {
  STUDIO_PRICE_EUR,
  STUDIO_UPGRADE_FROM_PRO_EUR,
  formatEuro,
} from "@/lib/billing/pricing";
import { buildPublicPortfolioUrl } from "@/lib/billing/activation";
import type { CVData } from "@/types/cv-data";

interface BillingPortfolioRow {
  id: string;
  cv_data: CVData;
  updated_at: string;
}

function getPortfolioName(cvData: CVData, isEn: boolean): string {
  return cvData.personal?.name ?? (isEn ? "Untitled portfolio" : "Portfolio sin nombre");
}

export default async function DashboardBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string; plan?: string }>;
}) {
  const supabase = await createClient();
  const locale = await getServerLocale();
  const isEn = locale === "en";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const requestedPortfolioId = params.portfolioId;
  const requestedPlan = params.plan;

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("username, plan")
    .eq("id", user.id)
    .single();
  const profile =
    (profileRaw as { username?: string; plan?: ProfilePlan } | null) ?? null;
  const plan = resolvePlan(profile?.plan);

  const { data: portfoliosRaw } = await supabase
    .from("portfolios")
    .select("id, cv_data, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const portfolios = (portfoliosRaw as BillingPortfolioRow[] | null) ?? [];

  const selectedPortfolio =
    portfolios.find((item) => item.id === requestedPortfolioId) ?? portfolios[0];
  if (!selectedPortfolio) redirect("/upload");

  const username = profile?.username?.trim().toLowerCase();
  const publicUrl = username ? buildPublicPortfolioUrl(username) : null;
  const fallbackPublicPath = username ? `/p/${username}` : null;
  const isPaid = isPaidPlan(plan);
  const hasProAccess = plan === "premium" || plan === "studio";
  const hasStudioAccess = plan === "studio";
  const isUpgradeFromPro = plan === "premium";
  const activePlanLabel = hasStudioAccess ? "Studio" : hasProAccess ? "Pro" : null;
  const isProHighlighted = requestedPlan === "publish";
  const isStudioHighlighted = requestedPlan === "studio";
  const studioUpgradePriceLabel = formatEuro(STUDIO_UPGRADE_FROM_PRO_EUR);
  const studioOriginalPriceLabel = formatEuro(STUDIO_PRICE_EUR);

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <header className="border-b border-[var(--sand)] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-3">
          <Link
            href={`/dashboard?portfolioId=${selectedPortfolio.id}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--ink)] hover:text-[var(--rust)] no-underline"
          >
            <ArrowLeft className="w-4 h-4" />
            {isEn ? "Back to dashboard" : "Volver al dashboard"}
          </Link>
          <div className="flex items-center gap-3">
            <LocaleToggle locale={locale} />
            <p className="text-xs text-[var(--muted-color)]">
              {isEn ? "Publishing activation" : "Activación de publicación"}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section className="rounded-xl border border-[var(--sand)] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--rust)] font-medium">
            {isEn ? "Selected portfolio" : "Portfolio seleccionado"}
          </p>
          <h1 className="mt-2 font-display text-[1.7rem] text-[var(--ink)] tracking-tight">
            {getPortfolioName(selectedPortfolio.cv_data, isEn)}
          </h1>
          <p className="text-sm text-[var(--muted-color)] mt-1">
            {isEn
              ? "This is the portfolio that will be published when you activate a plan."
              : "Este es el portfolio que se publicará al activar un plan."}
          </p>

          {publicUrl && (
            <p className="mt-3 text-sm text-[var(--ink)]">
              {isEn ? "Target public URL:" : "URL pública objetivo:"}{" "}
              <span className="font-mono text-[0.85rem]">{publicUrl}</span>
            </p>
          )}
        </section>

        {isPaid && publicUrl && (
          <section className="rounded-xl border border-[rgba(10,125,70,0.22)] bg-[rgba(10,125,70,0.08)] p-4 text-sm text-[rgb(10,125,70)]">
            {isEn
              ? `You already have the ${activePlanLabel} plan active. You can open your public portfolio now at `
              : `Ya tienes el plan ${activePlanLabel} activo. Puedes abrir ahora tu portfolio público en `}
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[rgb(10,125,70)] underline underline-offset-2"
            >
              {publicUrl}
            </a>
            .
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article
            className={`rounded-xl border bg-white p-5 ${isProHighlighted
              ? "border-[var(--ink)]"
              : "border-[var(--sand)]"
              }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-[var(--rust)]" />
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--rust)] font-medium">
                  Pro · €9,99
                </p>
              </div>
              {hasProAccess && (
                <span className="text-[0.65rem] px-2 py-1 rounded bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)] uppercase tracking-[0.08em] font-medium">
                  {isEn ? (hasStudioAccess ? "Included" : "Active") : hasStudioAccess ? "Incluido" : "Activo"}
                </span>
              )}
            </div>
            <h2 className="font-display text-[1.3rem] text-[var(--ink)] tracking-tight mt-2">
              {isEn ? "1 published site for 1 year" : "1 web publicada durante 1 año"}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted-color)]">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-[var(--rust)]" />
                {isEn ? "Public URL" : "URL pública"} {publicUrl ?? fallbackPublicPath ?? "/p/usuario"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-[var(--rust)]" />
                {isEn ? "Publishing for the selected portfolio" : "Publicación del portfolio seleccionado"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-[var(--rust)]" />
                {isEn ? "Unlimited visits" : "Sin límite de visitas"}
              </li>
            </ul>

            {hasProAccess ? (
              <button
                type="button"
                disabled
                className="mt-5 w-full rounded bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)] px-4 py-2.5 text-sm font-medium cursor-not-allowed"
              >
                {isEn
                  ? hasStudioAccess
                    ? "Included in Studio"
                    : "Pro plan active"
                  : hasStudioAccess
                    ? "Incluido en Studio"
                    : "Plan Pro activo"}
              </button>
            ) : (
              <CheckoutButton
                plan="publish"
                portfolioId={selectedPortfolio.id}
                className="mt-5 w-full rounded bg-[var(--ink)] text-[var(--paper)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--rust)] transition-colors"
              >
                {isEn ? "Activate Pro and publish" : "Activar Pro y publicar"}
              </CheckoutButton>
            )}
          </article>

          <article
            className={`rounded-xl border bg-white p-5 ${isStudioHighlighted
              ? "border-[var(--ink)]"
              : "border-[var(--sand)]"
              }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--rust)]" />
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
              </div>
              {hasStudioAccess && (
                <span className="text-[0.65rem] px-2 py-1 rounded bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)] uppercase tracking-[0.08em] font-medium">
                  {isEn ? "Active" : "Activo"}
                </span>
              )}
            </div>
            <h2 className="font-display text-[1.3rem] text-[var(--ink)] tracking-tight mt-2">
              {isEn
                ? "3 portfolios + 3 iterations per portfolio"
                : "3 portfolios + 3 iteraciones por portfolio"}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted-color)]">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-[var(--rust)]" />
                {isEn
                  ? "Up to 3 active portfolios in your account"
                  : "Hasta 3 portfolios activos en tu cuenta"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-[var(--rust)]" />
                {isEn
                  ? "3 chat iterations for each portfolio"
                  : "3 iteraciones con chat por cada portfolio"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-[var(--rust)]" />
                {isEn
                  ? "You can switch which portfolio is published on your subdomain"
                  : "Puedes cambiar cuál se publica en tu subdominio"}
              </li>
            </ul>
            {isUpgradeFromPro && !hasStudioAccess && (
              <p className="mt-3 text-xs text-[rgb(10,125,70)]">
                {isEn
                  ? "You already paid for Pro: €9.99 is discounted from this upgrade."
                  : "Ya pagaste Pro: se descuenta €9,99 en esta mejora."}
              </p>
            )}

            {hasStudioAccess ? (
              <button
                type="button"
                disabled
                className="mt-5 w-full rounded bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)] px-4 py-2.5 text-sm font-medium cursor-not-allowed"
              >
                {isEn ? "Studio plan active" : "Plan Studio activo"}
              </button>
            ) : (
              <CheckoutButton
                plan="studio"
                portfolioId={selectedPortfolio.id}
                className="mt-5 w-full rounded border border-[var(--sand)] bg-white text-[var(--ink)] px-4 py-2.5 text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-colors"
              >
                {isUpgradeFromPro
                  ? isEn
                    ? `Upgrade to Studio for ${studioUpgradePriceLabel}`
                    : `Mejorar a Studio por ${studioUpgradePriceLabel}`
                  : hasProAccess
                    ? isEn
                      ? "Upgrade to Studio"
                      : "Mejorar a Studio"
                    : isEn
                      ? "Activate Studio"
                      : "Activar Studio"}
              </CheckoutButton>
            )}
          </article>
        </section>

        <p className="text-xs text-[var(--muted-color)]">
          {isEn
            ? "Note: if Stripe is not connected yet, the flow runs in test mode without real billing so you can validate the full experience."
            : "Nota: si Stripe no está conectado aún, el flujo se activa en modo prueba sin cobro real para que puedas validar la experiencia completa."}
        </p>
      </div>
    </main>
  );
}
