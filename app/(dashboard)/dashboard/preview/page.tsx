import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PortfolioRenderer } from "@/components/portfolio/portfolio-renderer";
import type { CVData } from "@/types/cv-data";

export default async function DashboardPreviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("cv_data")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  const portfolioRecord = (portfolio as { cv_data: unknown } | null) ?? null;
  if (!portfolioRecord) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-black">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/75 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-white transition-colors no-underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
          <p className="text-xs text-white/70">
            Vista completa interactiva
          </p>
        </div>
      </header>

      <PortfolioRenderer
        cvData={portfolioRecord.cv_data as CVData}
        showBranding={false}
        interactiveGeneratedLanding={true}
      />
    </main>
  );
}
