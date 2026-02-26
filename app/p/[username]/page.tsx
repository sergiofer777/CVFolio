import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PortfolioRenderer } from "@/components/portfolio/portfolio-renderer";
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const billingEnforced = isBillingEnforcementEnabled();

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("id, full_name, plan")
    .eq("username", username)
    .single();
  const profile =
    (profileRaw as {
      id: string;
      full_name: string | null;
      plan?: ProfilePlan;
    } | null) ?? null;

  if (!profile) {
    return { title: "Portafolio no encontrado" };
  }

  if (billingEnforced && !isPaidPlan(profile.plan ?? "free")) {
    return { title: "Portafolio no disponible" };
  }

  const { data: portfolioRows } = await supabase
    .from("portfolios")
    .select("meta_title, meta_description, cv_data, published_at")
    .eq("user_id", profile.id)
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(1);
  const portfolio = (
    (portfolioRows as Array<{
      meta_title: string | null;
      meta_description: string | null;
      cv_data: unknown;
      published_at: string | null;
    }> | null) ?? []
  )[0];
  if (portfolio) {
    const publicationAccess = getPublicationAccess({
      plan: profile.plan ?? "free",
      publishedAt: portfolio.published_at,
    });
    if (publicationAccess.isExpired) {
      return { title: "Portafolio no disponible" };
    }
  }

  const cvData = portfolio?.cv_data as CVData | null;
  const name = cvData?.personal?.name ?? profile.full_name ?? username;
  const title = cvData?.personal?.title ?? "";

  return {
    title: portfolio?.meta_title ?? `${name} — Portafolio profesional`,
    description:
      portfolio?.meta_description ??
      `${title ? `${title}. ` : ""}Portafolio profesional de ${name} generado con webiculum.`,
    openGraph: {
      title: `${name} | webiculum`,
      description: `Portafolio de ${name}`,
      type: "profile",
    },
  };
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();
  const billingEnforced = isBillingEnforcementEnabled();

  // Buscar el profile por username
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("id, plan")
    .eq("username", username)
    .single();
  const profile =
    (profileRaw as { id: string; plan?: ProfilePlan } | null) ?? null;

  if (!profile) notFound();
  if (billingEnforced && !isPaidPlan(profile.plan ?? "free")) notFound();

  // Buscar el portafolio publicado
  const { data: portfolioRows } = await supabase
    .from("portfolios")
    .select("cv_data, theme, is_published, is_public, published_at")
    .eq("user_id", profile.id)
    .eq("is_published", true)
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(1);
  const portfolio =
    ((portfolioRows as Array<{ cv_data: unknown; published_at: string | null }> | null) ??
      [])[0] ?? null;

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
    />
  );
}
