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

function normalizeTemplateSergioInteractions(
  html: string,
  email?: string
): string {
  const looksLikeSergioTemplate =
    /hero-grid|btn-primary|theme-toggle|hero-photo-placeholder|section-title/i.test(
      html
    );
  if (!looksLikeSergioTemplate) return html;

  let output = html;
  const safeEmail =
    typeof email === "string" && email.includes("@") ? email.trim() : "";

  // Ensure language button exists and has click handler.
  output = output.replace(
    /<button(?![^>]*theme-toggle)([^>]*class=["'][^"']*nav-btn[^"']*["'][^>]*)>(ES|EN)<\/button>/i,
    (_match, attrs, lang) =>
      `<button id="lang-toggle" type="button" onclick="toggleLanguage()"${attrs}>${lang}</button>`
  );

  // Wire mailto links with real email when placeholders survive generation.
  if (safeEmail) {
    output = output.replace(
      /href=(["'])mailto:(you@email\.com|sergio@example\.com)\1/gi,
      `href="mailto:${safeEmail}"`
    );

    // If CTA button keeps placeholder href (#), redirect it to email.
    output = output.replace(
      /(<a[^>]*class=["'][^"']*btn-primary[^"']*["'][^>]*href=)(["'])(#|javascript:void\(0\)|\/?)\2/gi,
      `$1"mailto:${safeEmail}"`
    );
  }

  // Inject a minimal language toggle helper if it is missing.
  if (!/function\s+toggleLanguage\s*\(/i.test(output)) {
    const languageScript = `
    function toggleLanguage() {
      const button = document.getElementById('lang-toggle');
      if (!button) return;
      const current = (document.documentElement.lang || button.textContent || 'es')
        .toLowerCase()
        .startsWith('en')
        ? 'en'
        : 'es';
      const next = current === 'es' ? 'en' : 'es';
      document.documentElement.lang = next;
      button.textContent = next.toUpperCase();
      try { localStorage.setItem('webiculum_lang', next); } catch (_e) {}
    }

    (function initLanguageButton() {
      const button = document.getElementById('lang-toggle');
      if (!button) return;
      let initial = 'es';
      try { initial = localStorage.getItem('webiculum_lang') || initial; } catch (_e) {}
      const normalized = String(initial).toLowerCase().startsWith('en') ? 'en' : 'es';
      document.documentElement.lang = normalized;
      button.textContent = normalized.toUpperCase();
    })();
`;

    if (/<\/script>/i.test(output)) {
      output = output.replace(/<\/script>/i, `${languageScript}</script>`);
    } else if (/<\/body>/i.test(output)) {
      output = output.replace(
        /<\/body>/i,
        `<script>${languageScript}</script></body>`
      );
    } else {
      output = `${output}\n<script>${languageScript}</script>`;
    }
  }

  return output;
}

function normalizeTemplateMariaInteractions(
  html: string,
  email?: string
): string {
  const looksLikeMariaTemplate =
    /ambient-blob|NuraHealth|id=["']contacto["']/i.test(html) ||
    /Introduce tu email|Solicitar Acceso|Enviar Mensaje/i.test(html);

  if (!looksLikeMariaTemplate) return html;

  let output = html;
  const safeEmail =
    typeof email === "string" && email.includes("@") ? email.trim() : "";
  const existingEmail = output.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const contactEmail = safeEmail || existingEmail;

  if (contactEmail) {
    const emailLink = `<a href="mailto:${contactEmail}" class="inline-block font-display text-2xl md:text-4xl font-semibold tracking-tight text-nura-400 hover:text-white transition-colors">${contactEmail}</a>`;

    // Replace placeholder contact forms with a direct email CTA.
    output = output.replace(/<form\b[\s\S]*?<\/form>/gi, (formMarkup) => {
      if (!/Introduce tu email|Solicitar Acceso|Enviar Mensaj/i.test(formMarkup)) {
        return formMarkup;
      }
      return emailLink;
    });

    // Replace demo buttons with actionable mailto links.
    output = output.replace(
      /<button([^>]*)>([\s\S]*?(?:Enviar Mensaje|Enviar mensaje|Solicitar Acceso)[\s\S]*?)<\/button>/gi,
      (_match, attrs, innerHtml) => {
        const classMatch = attrs.match(/class=(["'])(.*?)\1/i);
        const className = classMatch?.[2] ?? "btn-glow px-6 py-3 rounded-xl text-white font-bold text-sm";
        return `<a href="mailto:${contactEmail}" class="${className}">${innerHtml}</a>`;
      }
    );

    output = output.replace(
      /(<a[^>]*class=["'][^"']*(?:btn-glow|btn-primary)[^"']*["'][^>]*href=)(["'])(?:#|javascript:void\(0\)|\/?)\2/gi,
      `$1"mailto:${contactEmail}"`
    );
  }

  // Remove demo-only alert handlers that break in sandboxed public view.
  output = output.replace(/\s*onclick=(["'])alert\([\s\S]*?\)\1/gi, "");

  return output;
}

export function buildRenderableGeneratedHtml(cvData: CVData): string | undefined {
  const generatedHtmlRaw =
    cvData.generatedLanding?.html ??
    extractHtmlFromLandingMarkdown(cvData.generatedLanding?.markdown);
  if (!generatedHtmlRaw) return undefined;

  return injectTemplateIvanTypingOverride(
    normalizeTemplateMariaInteractions(
      normalizeTemplateSergioInteractions(
        normalizeTemplateIvanAssets(generatedHtmlRaw),
        cvData.personal?.email
      ),
      cvData.personal?.email
    ),
    buildTemplateIvanTypingPhrases(cvData)
  );
}
