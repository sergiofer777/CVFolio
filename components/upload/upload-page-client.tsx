"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dropzone } from "@/components/upload/dropzone";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  DEFAULT_PORTFOLIO_THEME,
  PORTFOLIO_THEME_OPTIONS,
  isPortfolioTheme,
} from "@/lib/templates/portfolio-themes";
import type { PortfolioTheme } from "@/types/cv-data";

export function UploadPageClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PortfolioTheme>(DEFAULT_PORTFOLIO_THEME);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const templateFromUrl = params.get("template");
    if (templateFromUrl && isPortfolioTheme(templateFromUrl)) {
      setSelectedTemplate(templateFromUrl);
    }
  }, []);

  const handleUploadComplete = (portfolioId: string) => {
    router.push(`/dashboard?portfolioId=${portfolioId}&new=true`);
  };

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <header className="border-b border-[var(--sand)] px-6 md:px-12 py-5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-[var(--ink)] tracking-tight no-underline"
          >
            web<span className="text-[var(--rust)]">iculum</span>
          </Link>
          <LogoutButton label="Salir" />
        </div>
      </header>

      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 lg:px-10 py-10 md:py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.25fr] gap-8 lg:gap-10 items-start">
          <section className="space-y-8">
            <div className="text-center lg:text-left space-y-4">
              <div className="flex items-center justify-center lg:justify-start gap-2 text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium">
                <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
                Powered by Gemini 2.5 Pro
                <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
              </div>
              <h1 className="font-display text-[clamp(2.2rem,4vw,3.7rem)] font-light tracking-tight text-[var(--ink)] leading-[1.1]">
                Sube tu CV,
                <br />
                <em className="italic text-[var(--rust)]">obtén tu portafolio</em>
              </h1>
              <p className="text-[var(--muted-color)] text-[1.03rem] max-w-xl mx-auto lg:mx-0 font-light leading-[1.7]">
                Arrastra tu currículum y en segundos tendrás una página web
                profesional lista para compartir.
              </p>
            </div>

            <section className="space-y-4">
              <div className="text-center lg:text-left">
                <p className="text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium">
                  Elige plantilla
                </p>
                <h2 className="font-display text-[1.4rem] text-[var(--ink)] tracking-tight mt-1">
                  Base visual de tu portafolio
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                {PORTFOLIO_THEME_OPTIONS.map((template) => {
                  const selected = template.id === selectedTemplate;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`text-left rounded-xl border p-4 transition-all ${
                        selected
                          ? "border-[var(--ink)] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
                          : "border-[var(--sand)] bg-white/60 hover:bg-white hover:border-[var(--ink)]"
                      }`}
                    >
                      <div className={`h-1.5 w-full rounded-full ${template.accentClass}`} />
                      <p className="mt-3 font-display text-sm text-[var(--ink)]">
                        {template.name}
                      </p>
                      <p className="text-[0.72rem] text-[var(--rust)] font-medium mt-1">
                        {template.tagline}
                      </p>
                      <p className="text-[0.72rem] text-[var(--muted-color)] leading-relaxed mt-2">
                        {template.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          </section>

          <section className="space-y-5">
            <Dropzone
              onUploadComplete={handleUploadComplete}
              onError={(err) => setError(err)}
              selectedTemplate={selectedTemplate}
            />

            {error && (
              <div className="rounded-lg bg-[rgba(192,68,10,0.08)] border border-[rgba(192,68,10,0.2)] px-4 py-3 text-sm text-[var(--rust)] text-center">
                {error}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
