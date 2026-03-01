import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { PortfolioRenderer } from "@/components/portfolio/portfolio-renderer";
import { getServerLocale } from "@/lib/locale-server";
import type { CVData } from "@/types/cv-data";
import {
  getPublicationAccess,
  isPaidPlan,
  type ProfilePlan,
} from "@/lib/billing/access";
import { isBillingEnforcementEnabled } from "@/lib/billing/config";

interface PageProps {
  params: Promise<{ username: string }>;
}

interface PublicPortfolioSnapshot {
  profile: {
    id: string;
    full_name: string | null;
    plan: ProfilePlan;
  } | null;
  portfolio: {
    cv_data: unknown;
    published_at: string | null;
    meta_title: string | null;
    meta_description: string | null;
  } | null;
}

async function loadPublicPortfolioByUsername(
  username: string
): Promise<PublicPortfolioSnapshot> {
  const admin = createAdminClient();

  const { data: profileRaw } = await admin
    .from("profiles")
    .select("id, full_name, plan")
    .eq("username", username)
    .maybeSingle();
  const profile =
    (profileRaw as {
      id: string;
      full_name: string | null;
      plan?: ProfilePlan;
    } | null) ?? null;

  if (!profile) {
    return { profile: null, portfolio: null };
  }

  const { data: portfolioRows } = await admin
    .from("portfolios")
    .select("cv_data, published_at, meta_title, meta_description")
    .eq("user_id", profile.id)
    .eq("is_published", true)
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  const portfolio =
    ((portfolioRows as Array<{
      cv_data: unknown;
      published_at: string | null;
      meta_title: string | null;
      meta_description: string | null;
    }> | null) ?? [])[0] ?? null;

  return {
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      plan: (profile.plan ?? "free") as ProfilePlan,
    },
    portfolio,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const locale = await getServerLocale();
  const isEn = locale === "en";
  const billingEnforced = isBillingEnforcementEnabled();

  const { profile, portfolio } = await loadPublicPortfolioByUsername(username);

  if (!profile) {
    return { title: isEn ? "Portfolio not found" : "Portafolio no encontrado" };
  }

  if (billingEnforced && !isPaidPlan(profile.plan ?? "free")) {
    return { title: isEn ? "Portfolio unavailable" : "Portafolio no disponible" };
  }

  if (portfolio) {
    const publicationAccess = getPublicationAccess({
      plan: profile.plan ?? "free",
      publishedAt: portfolio.published_at,
    });
    if (publicationAccess.isExpired) {
      return { title: isEn ? "Portfolio unavailable" : "Portafolio no disponible" };
    }
  }

  const cvData = portfolio?.cv_data as CVData | null;
  const name = cvData?.personal?.name ?? profile.full_name ?? username;
  const title = cvData?.personal?.title ?? "";

  return {
    title: portfolio?.meta_title ?? `${name} — ${isEn ? "Professional portfolio" : "Portafolio profesional"}`,
    description:
      portfolio?.meta_description ??
      `${
        title ? `${title}. ` : ""
      }${
        isEn
          ? `Professional portfolio for ${name} generated with webiculum.`
          : `Portafolio profesional de ${name} generado con webiculum.`
      }`,
    openGraph: {
      title: `${name} | webiculum`,
      description: isEn ? `${name}'s portfolio` : `Portafolio de ${name}`,
      type: "profile",
    },
  };
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { username } = await params;
  const locale = await getServerLocale();
  const billingEnforced = isBillingEnforcementEnabled();
  const { profile, portfolio } = await loadPublicPortfolioByUsername(username);

  if (!profile) notFound();
  if (billingEnforced && !isPaidPlan(profile.plan ?? "free")) notFound();

  if (!portfolio) notFound();
  const publicationAccess = getPublicationAccess({
    plan: profile.plan ?? "free",
    publishedAt: portfolio.published_at,
  });
  if (publicationAccess.isExpired) notFound();

  return (
    <PortfolioRenderer
      cvData={portfolio.cv_data as CVData}
      showBranding={true}
      locale={locale}
    />
  );
}
