import type { CVData } from "@/types/cv-data";
import { HeroSection } from "./sections/hero-section";
import { ExperienceSection } from "./sections/experience-section";
import { EducationSection } from "./sections/education-section";
import { SkillsSection } from "./sections/skills-section";
import { ProjectsSection } from "./sections/projects-section";
import { CertificationsSection } from "./sections/certifications-section";
import { cn } from "@/lib/utils";
import {
  buildTemplateIvanTypingPhrases,
  injectTemplateIvanTypingOverride,
} from "@/lib/templates/template-ivan-typing";

interface PortfolioRendererProps {
  cvData: CVData;
  showBranding?: boolean;
  interactiveGeneratedLanding?: boolean;
}

function extractHtmlFromLandingMarkdown(markdown?: string): string | undefined {
  if (!markdown) return undefined;

  const htmlFence = markdown.match(/```html\s*([\s\S]*?)```/i);
  if (htmlFence?.[1]) return htmlFence[1].trim();

  const doctypeMatches = markdown.match(/<!doctype html[\s\S]*?<\/html>/gi);
  if (doctypeMatches?.length) return doctypeMatches[doctypeMatches.length - 1].trim();

  const htmlMatches = markdown.match(/<html[\s\S]*?<\/html>/gi);
  if (htmlMatches?.length) return htmlMatches[htmlMatches.length - 1].trim();

  return undefined;
}

function normalizeTemplateIvanAssets(html: string): string {
  const looksLikeIvanTemplate =
    /ivansevilla\.es/i.test(html) ||
    /nav-logo-dot|hero-avatar|langToggle|scrollProgress/i.test(html);

  if (!looksLikeIvanTemplate) return html;

  return html
    .replace(/href=(["'])styles\.css\1/gi, 'href="https://ivansevilla.es/styles.css"')
    .replace(/src=(["'])script\.js\1/gi, 'src="https://ivansevilla.es/script.js"')
    .replace(
      /(href|src)=(["'])img\//gi,
      '$1=$2https://ivansevilla.es/img/'
    );
}

export function PortfolioRenderer({
  cvData,
  showBranding = true,
  interactiveGeneratedLanding = true,
}: PortfolioRendererProps) {
  const generatedHtmlRaw =
    cvData.generatedLanding?.html ??
    extractHtmlFromLandingMarkdown(cvData.generatedLanding?.markdown);
  const generatedHtml = generatedHtmlRaw
    ? injectTemplateIvanTypingOverride(
        normalizeTemplateIvanAssets(generatedHtmlRaw),
        buildTemplateIvanTypingPhrases(cvData)
      )
    : undefined;

  if (generatedHtml) {
    const previewGuardScript = `<script data-webiculum-preview-guard>(function(){
  var handled = false;
  if (window.__webiculumPreviewGuardApplied) return;
  window.__webiculumPreviewGuardApplied = true;
  window.open = function(){ return null; };
  document.addEventListener("click", function(event){
    var target = event.target;
    if (!(target instanceof Element)) return;
    var anchor = target.closest("a");
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
    if (!handled) {
      handled = true;
      var hint = document.createElement("div");
      hint.textContent = "En esta vista previa los enlaces estan bloqueados. Usa 'Vista completa' para navegar.";
      hint.style.cssText = "position:fixed;bottom:16px;left:16px;right:16px;max-width:640px;background:rgba(9,9,11,0.9);color:#fff;padding:10px 12px;border-radius:10px;font:500 12px/1.4 system-ui;z-index:2147483647;";
      document.body.appendChild(hint);
      setTimeout(function(){ hint.remove(); }, 2200);
    }
  }, true);
  document.addEventListener("submit", function(event){
    event.preventDefault();
    event.stopPropagation();
  }, true);
})();</script>`;

    const previewHtml = generatedHtml;
    const guardedPreviewHtml =
      /<\/body>/i.test(previewHtml) && !previewHtml.includes("data-webiculum-preview-guard")
        ? previewHtml.replace(/<\/body>/i, `${previewGuardScript}</body>`)
        : `${previewHtml}${previewGuardScript}`;

    return (
      <div className="relative min-h-screen bg-black">
        <iframe
          title={`Landing generada de ${cvData.personal.name}`}
          srcDoc={
            interactiveGeneratedLanding ? generatedHtml : guardedPreviewHtml
          }
          className={cn(
            "w-full border-0",
            interactiveGeneratedLanding ? "h-screen" : "h-[78vh] min-h-[600px]"
          )}
          sandbox="allow-scripts"
        />

        {!interactiveGeneratedLanding && (
          <div className="absolute top-3 right-3 rounded bg-black/70 text-white text-xs px-2.5 py-1.5 pointer-events-none">
            Vista previa no interactiva
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-body">
      {/* Hero */}
      <HeroSection personal={cvData.personal} />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 sm:px-10 py-12 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-10">
            <ExperienceSection experience={cvData.experience} />
            <ProjectsSection projects={cvData.projects} />
          </div>

          {/* Sidebar */}
          <div className="space-y-10">
            <SkillsSection skills={cvData.skills} />
            <EducationSection education={cvData.education} />
            <CertificationsSection certifications={cvData.certifications} />
          </div>
        </div>
      </main>

      {/* Footer */}
      {showBranding && (
        <footer className="border-t border-[var(--cream)] mt-12 py-6 text-center">
          <a
            href={process.env.NEXT_PUBLIC_APP_URL ?? "/"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors no-underline"
          >
            Creado con{" "}
            <span className="font-display font-semibold">
              web<span className="text-[var(--rust)]">iculum</span>
            </span>
          </a>
        </footer>
      )}
    </div>
  );
}
