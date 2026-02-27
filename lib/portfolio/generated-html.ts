import type { CVData } from "@/types/cv-data";
import {
  buildTemplateIvanTypingPhrases,
  injectTemplateIvanTypingOverride,
} from "@/lib/templates/template-ivan-typing";

export function extractHtmlFromLandingMarkdown(
  markdown?: string
): string | undefined {
  if (!markdown) return undefined;

  const htmlFence = markdown.match(/```html\s*([\s\S]*?)```/i);
  if (htmlFence?.[1]) return htmlFence[1].trim();

  const doctypeMatches = markdown.match(/<!doctype html[\s\S]*?<\/html>/gi);
  if (doctypeMatches?.length) return doctypeMatches[doctypeMatches.length - 1].trim();

  const htmlMatches = markdown.match(/<html[\s\S]*?<\/html>/gi);
  if (htmlMatches?.length) return htmlMatches[htmlMatches.length - 1].trim();

  return undefined;
}

export function normalizeTemplateIvanAssets(html: string): string {
  const looksLikeIvanTemplate =
    /ivansevilla\.es/i.test(html) ||
    /nav-logo-dot|hero-avatar|langToggle|scrollProgress/i.test(html);

  if (!looksLikeIvanTemplate) return html;

  return html
    .replace(/href=(["'])styles\.css\1/gi, 'href="https://ivansevilla.es/styles.css"')
    .replace(/src=(["'])script\.js\1/gi, 'src="https://ivansevilla.es/script.js"')
    .replace(/(href|src)=(["'])img\//gi, '$1=$2https://ivansevilla.es/img/');
}

export function buildRenderableGeneratedHtml(cvData: CVData): string | undefined {
  const generatedHtmlRaw =
    cvData.generatedLanding?.html ??
    extractHtmlFromLandingMarkdown(cvData.generatedLanding?.markdown);
  if (!generatedHtmlRaw) return undefined;

  return injectTemplateIvanTypingOverride(
    normalizeTemplateIvanAssets(generatedHtmlRaw),
    buildTemplateIvanTypingPhrases(cvData)
  );
}
