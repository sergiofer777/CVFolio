import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Crown, Sparkles } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { DowngradeToProButton } from "@/components/billing/downgrade-to-pro-button";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
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
import { isBillingMockPaymentsEnabled } from "@/lib/billing/config";
import { buildPublicPortfolioUrl } from "@/lib/billing/activation";
import {
  formatBillingDateTime,
  getUserBillingSubscriptionStatus,
} from "@/lib/billing/subscription-status";
import type { CVData } from "@/types/cv-data";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

interface BillingPortfolioRow {
  id: string;
  cv_data: CVData;
  updated_at: string;
}

export const metadata: Metadata = buildPageMetadata({
  title: "Billing & Plans",
  description:
    "Manage your Webiculum subscription, compare Pro and Studio, and keep your public website and subdomain active year after year.",
  path: "/dashboard/billing",
  keywords: [
    "webiculum billing",
    "pro plan",
    "studio plan",
    "subscription management",
  ],
  imagePath: "/template-previews/ivan-top.png",
  imageAlt: "Webiculum billing and plans page preview",
  noIndex: true,
});

function getPortfolioName(cvData: CVData, isEn: boolean): string {
  return cvData.personal?.name ?? (isEn ? "Untitled website" : "Web sin nombre");
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
  const billingMockEnabled = isBillingMockPaymentsEnabled();
  const subscriptionStatus =
    isPaid && !billingMockEnabled
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
  const activePlanLabel = hasStudioAccess ? "Studio" : hasProAccess ? "Pro" : null;
  const isProHighlighted = requestedPlan === "publish";
  const isStudioHighlighted = requestedPlan === "studio";
  const studioUpgradePriceLabel = formatEuro(STUDIO_UPGRADE_FROM_PRO_EUR, locale);
  const studioOriginalPriceLabel = formatEuro(STUDIO_PRICE_EUR, locale);

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
            {isEn ? "Selected website" : "Web seleccionada"}
          </p>
          <h1 className="mt-2 font-display text-[1.7rem] text-[var(--ink)] tracking-tight">
            {getPortfolioName(selectedPortfolio.cv_data, isEn)}
          </h1>
          <p className="text-sm text-[var(--muted-color)] mt-1">
            {isEn
              ? "This is the website that will be published when you activate a plan."
              : "Esta es la web que se publicará al activar un plan."}
          </p>

          {publicUrl && (
            <p className="mt-3 text-sm text-[var(--ink)]">
              {isEn ? "Target public URL:" : "URL pública objetivo:"}{" "}
              <span className="font-mono text-[0.85rem]">{publicUrl}</span>
            </p>
          )}
        </section>

        {isStudioHighlighted && isUpgradeFromPro && (
          <section className="rounded-xl border border-[rgba(192,68,10,0.2)] bg-[rgba(192,68,10,0.06)] p-4 text-sm text-[var(--rust)]">
            <strong>
              {isEn
                ? "Pro only includes one generated website and no AI edit iterations."
                : "Pro solo incluye una web generada y no tiene iteraciones de edición con IA."}
            </strong>{" "}
            {isEn
              ? "Upgrade to Studio to create another website and unlock chat-based edits."
              : "Mejora a Studio para crear otra web y desbloquear las ediciones por chat."}
          </section>
        )}

        {isPaid && publicUrl && (
          <section
            className={`rounded-xl border p-4 text-sm ${
              hasScheduledCancellation
                ? "border-[rgba(192,68,10,0.2)] bg-[rgba(192,68,10,0.06)] text-[var(--rust)]"
                : "border-[rgba(10,125,70,0.22)] bg-[rgba(10,125,70,0.08)] text-[rgb(10,125,70)]"
            }`}
          >
            {hasScheduledCancellation && subscriptionEndsAtLabel ? (
              <>
                <strong>
                  {isEn
                    ? `${activePlanLabel} will end on ${subscriptionEndsAtLabel}.`
                    : `${activePlanLabel} terminará el ${subscriptionEndsAtLabel}.`}
                </strong>{" "}
                {isEn
                  ? "Your public domain will stop being active on that date unless the subscription is resumed before then."
                  : "Tu dominio público dejará de estar activo en esa fecha si la suscripción no se reactiva antes."}
              </>
            ) : (
              <>
                {isEn
                  ? `You already have the ${activePlanLabel} plan active. You can open your public website now at `
                  : `Ya tienes el plan ${activePlanLabel} activo. Puedes abrir ahora tu web pública en `}
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-medium underline underline-offset-2 ${
                    hasScheduledCancellation
                      ? "text-[var(--rust)]"
                      : "text-[rgb(10,125,70)]"
                  }`}
                >
                  {publicUrl}
                </a>
                .
              </>
            )}
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
                  {isEn ? "Pro · 9.99 €/year" : "Pro · 9,99 €/año"}
                </p>
              </div>
              {hasProAccess && (
                <span
                  className={`text-[0.65rem] px-2 py-1 rounded uppercase tracking-[0.08em] font-medium ${
                    !hasStudioAccess && hasScheduledCancellation
                      ? "bg-[rgba(192,68,10,0.12)] text-[var(--rust)]"
                      : "bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)]"
                  }`}
                >
                  {isEn
                    ? hasStudioAccess
                      ? "Included"
                      : hasScheduledCancellation
                        ? "Cancels"
                        : "Active"
                    : hasStudioAccess
                      ? "Incluido"
                      : hasScheduledCancellation
                        ? "Cancelada"
                        : "Activo"}
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
                {isEn ? "Publishing for the selected website" : "Publicación de la web seleccionada"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-[var(--rust)]" />
                {isEn ? "Unlimited visits" : "Sin límite de visitas"}
              </li>
            </ul>

            {hasProAccess ? (
              <>
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
                {!hasStudioAccess && !billingMockEnabled && (
                  <ManageSubscriptionButton className="mt-3 w-full rounded border border-[var(--sand)] bg-white text-[var(--ink)] px-4 py-2.5 text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-colors">
                    {isEn ? "Manage subscription" : "Gestionar suscripción"}
                  </ManageSubscriptionButton>
                )}
                {!hasStudioAccess && hasScheduledCancellation && subscriptionEndsAtLabel && (
                  <p className="mt-3 text-xs leading-5 text-[var(--rust)]">
                    {isEn
                      ? `Your public domain will stop being active on ${subscriptionEndsAtLabel} unless the subscription is resumed before then.`
                      : `Tu dominio público dejará de estar activo el ${subscriptionEndsAtLabel} si la suscripción no se reactiva antes.`}
                  </p>
                )}
              </>
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
                    isEn ? "Studio · 24.99 €/year" : "Studio · 24,99 €/año"
                  )}
                </p>
              </div>
              {hasStudioAccess && (
                <span
                  className={`text-[0.65rem] px-2 py-1 rounded uppercase tracking-[0.08em] font-medium ${
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
              )}
            </div>
            <h2 className="font-display text-[1.3rem] text-[var(--ink)] tracking-tight mt-2">
              {isEn
                ? "3 websites + 3 iterations per website"
                : "3 webs + 3 iteraciones por web"}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted-color)]">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-[var(--rust)]" />
                {isEn
                  ? "Up to 3 active websites in your account"
                  : "Hasta 3 webs activas en tu cuenta"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-[var(--rust)]" />
                {isEn
                  ? "3 chat iterations for each website"
                  : "3 iteraciones con chat por cada web"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-[var(--rust)]" />
                {isEn
                  ? "You can switch which website is published on your subdomain"
                  : "Puedes cambiar cuál se publica en tu subdominio"}
              </li>
            </ul>
            {isUpgradeFromPro && !hasStudioAccess && (
              <p className="mt-3 text-xs text-[rgb(10,125,70)]">
                {isEn
                    ? "You already paid for Pro: 9.99 € is discounted from this upgrade."
                    : "Ya pagaste Pro: se descuenta €9,99 en esta mejora."}
              </p>
            )}

            {hasStudioAccess ? (
              <>
                <button
                  type="button"
                  disabled
                  className="mt-5 w-full rounded bg-[rgba(10,125,70,0.12)] text-[rgb(10,125,70)] px-4 py-2.5 text-sm font-medium cursor-not-allowed"
                >
                  {isEn ? "Studio plan active" : "Plan Studio activo"}
                </button>
                {!billingMockEnabled && (
                  <>
                    <ManageSubscriptionButton className="mt-3 w-full rounded border border-[var(--sand)] bg-white text-[var(--ink)] px-4 py-2.5 text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-colors">
                      {isEn ? "Manage subscription" : "Gestionar suscripción"}
                    </ManageSubscriptionButton>
                    <DowngradeToProButton className="mt-3 w-full rounded border border-[var(--sand)] bg-[var(--cream)] text-[var(--ink)] px-4 py-2.5 text-sm font-medium hover:border-[var(--ink)] hover:bg-white transition-colors">
                      {isEn
                        ? "Downgrade to Pro at renewal"
                        : "Bajar a Pro en la renovación"}
                    </DowngradeToProButton>
                    <p className="mt-3 text-xs leading-5 text-[var(--muted-color)]">
                      {isEn
                        ? "Useful if you already have the site you want and only need to keep one public site active year after year."
                        : "Útil si ya tienes la web que quieres y solo necesitas mantener una única web pública activa año tras año."}
                    </p>
                  </>
                )}
                {hasScheduledCancellation && subscriptionEndsAtLabel && (
                  <p className="mt-3 text-xs leading-5 text-[var(--rust)]">
                    {isEn
                      ? `Your public domain will stop being active on ${subscriptionEndsAtLabel} unless the subscription is resumed before then.`
                      : `Tu dominio público dejará de estar activo el ${subscriptionEndsAtLabel} si la suscripción no se reactiva antes.`}
                  </p>
                )}
                {hasScheduledDowngradeToPro && scheduledDowngradeAtLabel && (
                  <p className="mt-3 text-xs leading-5 text-[var(--rust)]">
                    {isEn
                      ? `Studio stays active until ${scheduledDowngradeAtLabel}. From that date your plan will continue as Pro, and the website currently linked to your domain will remain as the published site.`
                      : `Studio seguirá activo hasta el ${scheduledDowngradeAtLabel}. A partir de esa fecha tu plan pasará a Pro y la web que tengas enlazada en ese momento a tu dominio se mantendrá como web publicada.`}
                  </p>
                )}
              </>
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

      </div>
    </main>
  );
}
