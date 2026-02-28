import type { PortfolioTheme } from "@/types/cv-data";

export interface PortfolioThemeOption {
  id: PortfolioTheme;
  name: string;
  tagline: string;
  description: string;
  accentClass: string;
}

export const DEFAULT_PORTFOLIO_THEME: PortfolioTheme = "minimal";

export const PORTFOLIO_THEME_OPTIONS: PortfolioThemeOption[] = [
  {
    id: "minimal",
    name: "Template Sergio",
    tagline: "Base personalizada",
    description:
      "Plantilla base subida por Sergio con estilo editorial y secciones modulares.",
    accentClass: "bg-[var(--ink)]",
  },
  {
    id: "modern",
    name: "Template Ivan",
    tagline: "Web3 y Growth",
    description:
      "Plantilla inmersiva estilo index-ivan, pensada para perfiles growth, fintech y blockchain.",
    accentClass: "bg-gradient-to-r from-cyan-600 to-blue-700",
  },
  {
    id: "bold",
    name: "Template Maria",
    tagline: "Medical Premium",
    description:
      "Plantilla visual premium basada en maria.html, con bloques inmersivos y look high-end.",
    accentClass: "bg-gradient-to-r from-orange-600 to-amber-500",
  },
];

export function isPortfolioTheme(value: string): value is PortfolioTheme {
  return PORTFOLIO_THEME_OPTIONS.some((option) => option.id === value);
}
