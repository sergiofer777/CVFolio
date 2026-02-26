import type { PortfolioTheme } from "@/types/cv-data";
import { DEFAULT_PORTFOLIO_THEME } from "@/lib/templates/portfolio-themes";
import { TEMPLATE_SERGIO_HTML } from "./template-sergio";
import { TEMPLATE_IVAN_HTML } from "./template-ivan";

export interface LandingTemplateConfig {
  id: PortfolioTheme;
  name: string;
  direction: string;
  htmlSkeleton: string;
}

const TEMPLATE_CONFIGS: Record<PortfolioTheme, LandingTemplateConfig> = {
  minimal: {
    id: "minimal",
    name: "Template Sergio",
    direction:
      "Usa exactamente la estructura visual de template-sergio.html. Si una seccion (proyectos, certificaciones, educacion, imagen, etc.) no tiene datos fiables en el CV, elimina el bloque completo y sus separadores en lugar de dejar placeholders.",
    htmlSkeleton: TEMPLATE_SERGIO_HTML,
  },
  modern: {
    id: "modern",
    name: "Template Ivan",
    direction:
      "Usa exactamente la estructura visual de index-ivan.html. Si una seccion (proyectos, certificaciones, educacion, imagen, etc.) no tiene datos fiables en el CV, elimina el bloque completo y sus separadores en lugar de dejar placeholders.",
    htmlSkeleton: TEMPLATE_IVAN_HTML,
  },
  bold: {
    id: "bold",
    name: "Bold Impact",
    direction:
      "Look impactante con bloques grandes, acento naranja y mensajes orientados a conversion.",
    htmlSkeleton: `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <title>{{SEO_TITLE}}</title>
</head>
<body class="bg-neutral-100 text-neutral-950 antialiased">
  <main class="mx-auto max-w-6xl px-6 py-10 md:py-16">
    <!-- HERO -->
    <section class="rounded-[2rem] border-4 border-neutral-950 bg-white p-8 md:p-12 shadow-[10px_10px_0px_#171717]">
      <p class="text-xs uppercase tracking-[0.25em] text-orange-700">{{ROLE_TAG}}</p>
      <h1 class="mt-4 text-4xl md:text-6xl font-black tracking-tight">{{HERO_HEADLINE}}</h1>
      <p class="mt-4 max-w-3xl text-neutral-700 text-lg">{{HERO_SUBHEADLINE}}</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a class="rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white no-underline" href="#contacto">{{CTA_PRIMARY}}</a>
        <a class="rounded-xl border-2 border-neutral-950 px-5 py-3 text-sm font-semibold text-neutral-950 no-underline" href="#proyectos">{{CTA_SECONDARY}}</a>
      </div>
    </section>

    <!-- STORY -->
    <section class="mt-10 rounded-[2rem] border-4 border-neutral-950 bg-orange-100 p-6 md:p-8 shadow-[10px_10px_0px_#171717]">
      <h2 class="text-xs uppercase tracking-[0.2em] text-orange-700">Historia profesional</h2>
      <div class="mt-4 text-neutral-900 leading-relaxed">{{STORY_BLOCK}}</div>
    </section>

    <!-- KPI -->
    <section class="mt-10 grid gap-4 sm:grid-cols-3" id="resultados">
      {{METRICS_CARDS}}
    </section>

    <!-- EXPERIENCE + SKILLS -->
    <section class="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <article class="rounded-[2rem] border-4 border-neutral-950 bg-white p-6 shadow-[10px_10px_0px_#171717]" id="experiencia">
        <h2 class="text-xs uppercase tracking-[0.2em] text-neutral-500">Experiencia</h2>
        <div class="mt-4 space-y-4">{{EXPERIENCE_CARDS}}</div>
      </article>
      <article class="rounded-[2rem] border-4 border-neutral-950 bg-white p-6 shadow-[10px_10px_0px_#171717]" id="skills">
        <h2 class="text-xs uppercase tracking-[0.2em] text-neutral-500">Skills</h2>
        <div class="mt-4 flex flex-wrap gap-2">{{SKILLS_CHIPS}}</div>
      </article>
    </section>

    <!-- PROJECTS -->
    <section class="mt-10" id="proyectos">
      <h2 class="text-xs uppercase tracking-[0.2em] text-neutral-500">Proyectos</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-2">{{PROJECT_CARDS}}</div>
    </section>

    <!-- PHILOSOPHY + CTA -->
    <section class="mt-10 grid gap-6 md:grid-cols-2">
      <article class="rounded-[2rem] border-4 border-neutral-950 bg-white p-6 shadow-[10px_10px_0px_#171717]">
        <h2 class="text-xs uppercase tracking-[0.2em] text-neutral-500">Filosofia</h2>
        <p class="mt-4 text-neutral-900 leading-relaxed">{{PHILOSOPHY}}</p>
      </article>
      <footer class="rounded-[2rem] border-4 border-neutral-950 bg-neutral-950 p-6 text-white shadow-[10px_10px_0px_#ea580c]" id="contacto">
        <h2 class="text-2xl font-black tracking-tight">{{FINAL_CTA_HEADLINE}}</h2>
        <p class="mt-2 text-neutral-300">{{FINAL_CTA_TEXT}}</p>
        <div class="mt-5 flex flex-wrap gap-3">{{CONTACT_ACTIONS}}</div>
      </footer>
    </section>
  </main>
</body>
</html>`,
  },
};

export function getLandingTemplateConfig(
  templateId?: string
): LandingTemplateConfig {
  if (templateId && templateId in TEMPLATE_CONFIGS) {
    return TEMPLATE_CONFIGS[templateId as PortfolioTheme];
  }
  return TEMPLATE_CONFIGS[DEFAULT_PORTFOLIO_THEME];
}
