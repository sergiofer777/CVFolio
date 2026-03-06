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
import { buildPageMetadata } from "@/lib/seo/metadata";

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
  const billingEnforced = isBillingEnforcementEnabled();
  const encodedUsername = encodeURIComponent(username);
  const profilePath = `/p/${encodedUsername}`;

  const { profile, portfolio } = await loadPublicPortfolioByUsername(username);

  if (!profile) {
    return buildPageMetadata({
      title: "Website Not Found",
      description:
        "The public website you requested is not available or has not been published yet.",
      path: profilePath,
      keywords: ["website not found", "webiculum public profile"],
      imagePath: "/brand/webiculum-og-logo.jpg",
      imageAlt: "Webiculum public profile not found",
      noIndex: true,
    });
  }

  if (billingEnforced && !isPaidPlan(profile.plan ?? "free")) {
    return buildPageMetadata({
      title: "Website Unavailable",
      description:
        "This public website is currently unavailable because its publishing plan is not active.",
      path: profilePath,
      keywords: ["website unavailable", "webiculum publishing status"],
      imagePath: "/brand/webiculum-og-logo.jpg",
      imageAlt: "Webiculum website unavailable status",
      noIndex: true,
    });
  }

  if (portfolio) {
    const publicationAccess = getPublicationAccess({
      plan: profile.plan ?? "free",
      publishedAt: portfolio.published_at,
    });
    if (publicationAccess.isExpired) {
      return buildPageMetadata({
        title: "Website Unavailable",
        description:
          "This website is temporarily unavailable because the publication period has expired.",
        path: profilePath,
        keywords: ["expired public website", "webiculum website expiry"],
        imagePath: "/brand/webiculum-og-logo.jpg",
        imageAlt: "Webiculum website expiry notice",
        noIndex: true,
      });
    }
  }

  const cvData = portfolio?.cv_data as CVData | null;
  const name = cvData?.personal?.name ?? profile.full_name ?? username;
  const role = cvData?.personal?.title?.trim() ?? "";
  const resolvedTitle = portfolio?.meta_title?.trim()
    ? portfolio.meta_title
    : `${name} | Professional Website`;
  const resolvedDescription = portfolio?.meta_description?.trim()
    ? portfolio.meta_description
    : `${role ? `${role}. ` : ""}Explore ${name}'s professional website built with Webiculum.`;

  return buildPageMetadata({
    title: resolvedTitle,
    description: resolvedDescription,
    path: profilePath,
    type: "profile",
    keywords: [
      `${name} website`,
      `${name} portfolio`,
      role || "professional profile",
      "webiculum profile",
      "online resume website",
    ],
    imagePath: "/brand/webiculum-og-logo.jpg",
    imageAlt: `${name} public website preview`,
  });
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
