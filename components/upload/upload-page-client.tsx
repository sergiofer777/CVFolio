"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LocaleToggle } from "@/components/locale-toggle";
import { Dropzone } from "@/components/upload/dropzone";
import { LogoutButton } from "@/components/auth/logout-button";
import { useClientLocale } from "@/hooks/use-client-locale";
import {
  DEFAULT_PORTFOLIO_THEME,
  PORTFOLIO_THEME_OPTIONS,
  isPortfolioTheme,
} from "@/lib/templates/portfolio-themes";
import type { PortfolioTheme } from "@/types/cv-data";

const TEMPLATE_TAGLINES_EN: Record<PortfolioTheme, string> = {
  minimal: "Custom foundation",
  modern: "Web3 & Growth",
  bold: "Medical Premium",
};

const TEMPLATE_DESCRIPTIONS_EN: Record<PortfolioTheme, string> = {
  minimal:
    "Base template uploaded by Sergio with an editorial style and modular sections.",
  modern:
    "Immersive template based on index-ivan, designed for growth, fintech and blockchain profiles.",
  bold:
    "Premium visual template based on maria.html, with immersive blocks and a high-end look.",
};

export function UploadPageClient() {
  const router = useRouter();
  const locale = useClientLocale();
  const isEn = locale === "en";
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PortfolioTheme>(DEFAULT_PORTFOLIO_THEME);
  const [templateLocked, setTemplateLocked] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const templateFromUrl = params.get("template");
      if (templateFromUrl && isPortfolioTheme(templateFromUrl)) {
        setSelectedTemplate(templateFromUrl);
        setTemplateLocked(true);
      }
    } catch {
      // Ignore sessionStorage / URL parsing errors in restrictive browsers.
    }
  }, []);

  const lockTemplateAndContinue = () => {
    setTemplateLocked(true);
    setError(null);
  };

  const handleUploadComplete = (portfolioId: string) => {
    router.push(`/dashboard?portfolioId=${portfolioId}&new=true`);
  };

  const selectedTemplateOption = PORTFOLIO_THEME_OPTIONS.find(
    (option) => option.id === selectedTemplate
  );

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
          <div className="flex items-center gap-3">
            <LocaleToggle locale={locale} />
            <LogoutButton label={isEn ? "Log out" : "Salir"} />
          </div>
        </div>
      </header>

      <div className="w-full max-w-[1040px] mx-auto px-4 md:px-8 py-10 md:py-14 lg:py-16">
        <section className={`text-center ${templateLocked ? "space-y-2" : "space-y-4"}`}>
          <div className="flex items-center justify-center gap-2 text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium">
            <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
            {isEn ? "AI-powered generation" : "Generación potenciada por IA"}
            <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
          </div>
          <h1 className="font-display text-[clamp(2.5rem,5vw,4.3rem)] font-light tracking-tight text-[var(--ink)] leading-[1.06]">
            {isEn ? "Upload your CV," : "Sube tu CV,"}
            <br />
            <em className="italic text-[var(--rust)]">
              {isEn ? "get your website" : "obtén tu web"}
            </em>
          </h1>
          {!templateLocked && (
            <p className="text-[var(--muted-color)] text-[1rem] max-w-[620px] mx-auto font-light leading-[1.7]">
              {isEn
                ? "Choose the visual template first, then lock it and upload your resume."
                : "Elige primero la plantilla visual, bloquéala y después sube tu currículum."}
            </p>
          )}
          {templateLocked && (
            <p className="text-[var(--muted-color)] text-[0.95rem] max-w-[620px] mx-auto font-light leading-[1.7]">
              {isEn
                ? "Template locked. Now upload your CV to generate your website."
                : "Plantilla bloqueada. Ahora sube tu CV para generar tu web."}
            </p>
          )}
        </section>

        <div className="mt-10 md:mt-12 space-y-8">
          {!templateLocked && (
            <section className="rounded-2xl border border-[var(--sand)] bg-white px-5 py-5 md:px-6 md:py-6 shadow-[0_6px_24px_rgba(13,13,13,0.04)]">
              <div className="mb-5">
                <p className="text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium">
                  {isEn ? "Step 1" : "Paso 1"}
                </p>
                <h2 className="font-display text-[1.55rem] text-[var(--ink)] tracking-tight mt-1">
                  {isEn ? "Choose your template" : "Elige tu plantilla"}
                </h2>
                <p className="text-sm text-[var(--muted-color)] mt-2 leading-6">
                  {isEn
                    ? "This selection is locked before upload so users cannot change templates during the process."
                    : "Esta selección se bloquea antes de subir el CV para que nadie cambie de plantilla durante el proceso."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PORTFOLIO_THEME_OPTIONS.map((template) => {
                  const selected = template.id === selectedTemplate;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`group text-left rounded-xl border overflow-hidden transition-all ${
                        selected
                          ? "border-[var(--ink)] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
                          : "border-[var(--sand)] bg-white hover:border-[var(--ink)]"
                      }`}
                    >
                      <div className="h-28 bg-[var(--cream)] border-b border-[var(--sand)] overflow-hidden">
                        <Image
                          src={template.previewImage}
                          alt={
                            isEn
                              ? `Preview of ${template.name}`
                              : `Vista previa de ${template.name}`
                          }
                          width={1440}
                          height={520}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          style={{ objectPosition: template.previewObjectPosition }}
                        />
                      </div>
                      <div className="p-4">
                        <div className={`h-1.5 w-full rounded-full ${template.accentClass}`} />
                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-display text-sm text-[var(--ink)]">
                              {template.name}
                            </p>
                            <p className="text-[0.72rem] text-[var(--rust)] font-medium mt-1">
                              {isEn ? TEMPLATE_TAGLINES_EN[template.id] : template.tagline}
                            </p>
                          </div>
                          {selected && (
                            <span className="shrink-0 rounded-lg bg-[var(--ink)] px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.08em] text-white">
                              {isEn ? "Selected" : "Activa"}
                            </span>
                          )}
                        </div>
                        <p className="text-[0.72rem] text-[var(--muted-color)] leading-relaxed mt-2">
                          {isEn
                            ? TEMPLATE_DESCRIPTIONS_EN[template.id]
                            : template.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={lockTemplateAndContinue}
                  className="inline-flex items-center rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--rust)]"
                >
                  {isEn ? "Continue with this template" : "Continuar con esta plantilla"}
                </button>
              </div>
            </section>
          )}

          {templateLocked && selectedTemplateOption && (
            <section className="rounded-xl border border-[var(--sand)] bg-white px-4 py-3 shadow-[0_6px_20px_rgba(13,13,13,0.04)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-16 overflow-hidden rounded border border-[var(--sand)] bg-[var(--cream)]">
                  <Image
                    src={selectedTemplateOption.previewImage}
                    alt={selectedTemplateOption.name}
                    width={320}
                    height={120}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: selectedTemplateOption.previewObjectPosition }}
                  />
                </div>
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.1em] text-[var(--rust)] font-medium">
                    {isEn ? "Selected template" : "Plantilla seleccionada"}
                  </p>
                  <p className="text-sm text-[var(--ink)] font-medium">
                    {selectedTemplateOption.name}
                  </p>
                </div>
              </div>
            </section>
          )}

          {templateLocked && (
            <section className="space-y-5">
              <div className="text-center">
                <p className="text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium">
                  {isEn ? "Step 2" : "Paso 2"}
                </p>
                <h2 className="font-display text-[1.55rem] text-[var(--ink)] tracking-tight mt-1">
                  {isEn ? "Drop your CV" : "Arrastra tu CV"}
                </h2>
              </div>

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
          )}
        </div>
      </div>
    </main>
  );
}
