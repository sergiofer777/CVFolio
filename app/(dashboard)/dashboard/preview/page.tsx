import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { createClient } from "@/lib/supabase/server";
import { PortfolioRenderer } from "@/components/portfolio/portfolio-renderer";
import { getServerLocale } from "@/lib/locale-server";
import type { CVData } from "@/types/cv-data";
import {
  getFreePreviewAccess,
  resolvePlan,
  type ProfilePlan,
} from "@/lib/billing/access";
import { isBillingEnforcementEnabled } from "@/lib/billing/config";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Interactive Preview",
  description:
    "Open the full interactive preview of your generated website before publishing it to your public URL.",
  path: "/dashboard/preview",
  keywords: [
    "website preview",
    "interactive portfolio preview",
    "webiculum preview mode",
  ],
  imagePath: "/template-previews/ivan-top.png",
  imageAlt: "Webiculum full interactive preview",
  noIndex: true,
});

export default async function DashboardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const supabase = await createClient();
  const locale = await getServerLocale();
  const isEn = locale === "en";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const selectedPortfolioId = params.portfolioId;
  let portfolioQuery = supabase
    .from("portfolios")
    .select("id, cv_data, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (selectedPortfolioId) {
    portfolioQuery = supabase
      .from("portfolios")
      .select("id, cv_data, updated_at")
      .eq("user_id", user.id)
      .eq("id", selectedPortfolioId)
      .limit(1);
  }

  const { data: portfolioRows } = await portfolioQuery;
  const portfolioRecord =
    ((portfolioRows as Array<{ id: string; cv_data: unknown; updated_at?: string }> | null) ??
      [])[0] ?? null;
  if (!portfolioRecord) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = resolvePlan(
    ((profile as { plan?: ProfilePlan } | null)?.plan ?? "free") as ProfilePlan
  );

  const access = getFreePreviewAccess({
    plan,
    portfolioUpdatedAt: portfolioRecord.updated_at ?? null,
  });

  const billingEnforced = isBillingEnforcementEnabled();
  if (billingEnforced && access.isExpired) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-black">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/75 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link
            href={`/dashboard?portfolioId=${portfolioRecord.id}`}
            className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-white transition-colors no-underline"
          >
            <ArrowLeft className="w-4 h-4" />
            {isEn ? "Back to dashboard" : "Volver al dashboard"}
          </Link>
          <div className="flex items-center gap-3">
            <LocaleToggle
              locale={locale}
              className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 p-1"
            />
            <p className="text-xs text-white/70">
              {isEn ? "Interactive full view" : "Vista completa interactiva"}
            </p>
          </div>
        </div>
      </header>

      <PortfolioRenderer
        cvData={portfolioRecord.cv_data as CVData}
        showBranding={false}
        interactiveGeneratedLanding={true}
        locale={locale}
      />
    </main>
  );
}
