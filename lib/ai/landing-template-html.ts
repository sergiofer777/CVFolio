import type { PortfolioTheme } from "@/types/cv-data";
import { DEFAULT_PORTFOLIO_THEME } from "@/lib/templates/portfolio-themes";
import { TEMPLATE_SERGIO_HTML } from "./template-sergio";
import { TEMPLATE_IVAN_HTML } from "./template-ivan";
import { TEMPLATE_MARIA_HTML } from "./template-maria";

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
    name: "Template Maria",
    direction:
      "Usa exactamente la estructura visual de maria.html. Si una seccion (proyectos, certificaciones, educacion, imagen, etc.) no tiene datos fiables en el CV, elimina el bloque completo y sus separadores en lugar de dejar placeholders.",
    htmlSkeleton: TEMPLATE_MARIA_HTML,
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
