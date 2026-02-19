import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PortfolioRenderer } from "@/components/portfolio/portfolio-renderer";
import type { CVData } from "@/types/cv-data";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("username", username)
    .single();
  const profile =
    (profileRaw as { id: string; full_name: string | null } | null) ?? null;

  if (!profile) {
    return { title: "Portafolio no encontrado" };
  }

  const { data: portfolioRaw } = await supabase
    .from("portfolios")
    .select("meta_title, meta_description, cv_data")
    .eq("user_id", profile.id)
    .eq("is_published", true)
    .single();
  const portfolio =
    (portfolioRaw as {
      meta_title: string | null;
      meta_description: string | null;
      cv_data: unknown;
    } | null) ?? null;

  const cvData = portfolio?.cv_data as CVData | null;
  const name = cvData?.personal?.name ?? profile.full_name ?? username;
  const title = cvData?.personal?.title ?? "";

  return {
    title: portfolio?.meta_title ?? `${name} — Portafolio profesional`,
    description:
      portfolio?.meta_description ??
      `${title ? `${title}. ` : ""}Portafolio profesional de ${name} generado con CVfolio.`,
    openGraph: {
      title: `${name} | CVfolio`,
      description: `Portafolio de ${name}`,
      type: "profile",
    },
  };
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Buscar el profile por username
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();
  const profile = (profileRaw as { id: string } | null) ?? null;

  if (!profile) notFound();

  // Buscar el portafolio publicado
  const { data: portfolioRaw } = await supabase
    .from("portfolios")
    .select("cv_data, theme, is_published, is_public")
    .eq("user_id", profile.id)
    .eq("is_published", true)
    .eq("is_public", true)
    .single();
  const portfolio = (portfolioRaw as { cv_data: unknown } | null) ?? null;

  if (!portfolio) notFound();

  return (
    <PortfolioRenderer
      cvData={portfolio.cv_data as CVData}
      showBranding={true}
    />
  );
}
