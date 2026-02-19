import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortfolioRenderer } from "@/components/portfolio/portfolio-renderer";
import type { CVData } from "@/types/cv-data";
import { Upload, Eye, ExternalLink, Monitor } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string; new?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  const portfolioRecord = (portfolio as { cv_data: unknown } | null) ?? null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();
  const profileUsername =
    (profile as { username?: string } | null)?.username ?? null;

  const params = await searchParams;
  const isNew = params.new === "true";

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Top bar */}
      <header className="border-b border-[var(--sand)] bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="font-display text-xl font-semibold text-[var(--ink)] tracking-tight no-underline"
          >
            CV<span className="text-[var(--rust)]">folio</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--sand)] text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all no-underline"
            >
              <Upload className="w-3.5 h-3.5" />
              Actualizar CV
            </Link>

            {portfolioRecord && (
              <Link
                href="/dashboard/preview"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-white text-[var(--ink)] border border-[var(--sand)] text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all no-underline"
              >
                <Monitor className="w-3.5 h-3.5" />
                Vista completa
              </Link>
            )}

            {portfolioRecord && profileUsername && (
              <Link
                href={`/p/${profileUsername}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--rust)] transition-colors no-underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver portafolio público
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      {portfolioRecord ? (
        <div>
          {/* New banner */}
          {isNew && (
            <div className="bg-[rgba(192,68,10,0.06)] border-b border-[rgba(192,68,10,0.15)]">
              <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-2 text-sm text-[var(--rust)]">
                <span className="w-4 h-4 flex-shrink-0">✨</span>
                <span>
                  <strong>¡Portafolio generado!</strong> Aquí tienes una vista
                  previa de cómo se verá.
                  {profileUsername && (
                    <>
                      {" "}
                      Tu URL pública será:{" "}
                      <Link
                        href={`/p/${profileUsername}`}
                        target="_blank"
                        className="font-mono font-semibold underline underline-offset-2 text-[var(--rust)] no-underline hover:underline"
                      >
                        cvfolio.com/p/{profileUsername}
                      </Link>
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Preview label */}
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2 text-sm text-[var(--muted-color)]">
            <Eye className="w-4 h-4" />
            Vista previa de tu portafolio
          </div>

          {/* Portfolio */}
          <div className="border border-[var(--sand)] rounded-xl overflow-hidden max-w-6xl mx-auto mx-6 mb-8 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
            <PortfolioRenderer
              cvData={portfolioRecord.cv_data as CVData}
              showBranding={true}
              interactiveGeneratedLanding={false}
            />
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--cream)] flex items-center justify-center mb-6">
            <Upload className="w-7 h-7 text-[var(--muted-color)]" />
          </div>
          <h2 className="font-display text-[1.5rem] font-light tracking-tight text-[var(--ink)] mb-2">
            Aún no tienes portafolio
          </h2>
          <p className="text-[var(--muted-color)] text-sm mb-6 max-w-xs font-light">
            Sube tu CV y la IA generará tu portafolio profesional en segundos.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 bg-[var(--ink)] text-[var(--paper)] px-6 py-3 rounded text-sm font-medium hover:bg-[var(--rust)] transition-colors no-underline"
          >
            <Upload className="w-4 h-4" />
            Subir mi CV ahora
          </Link>
        </div>
      )}
    </div>
  );
}
