import type { CVData } from "@/types/cv-data";
import { HeroSection } from "./sections/hero-section";
import { ExperienceSection } from "./sections/experience-section";
import { EducationSection } from "./sections/education-section";
import { SkillsSection } from "./sections/skills-section";
import { ProjectsSection } from "./sections/projects-section";
import { CertificationsSection } from "./sections/certifications-section";
import { cn } from "@/lib/utils";
import { buildRenderableGeneratedHtml } from "@/lib/portfolio/generated-html";
import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";

interface PortfolioRendererProps {
  cvData: CVData;
  showBranding?: boolean;
  interactiveGeneratedLanding?: boolean;
  locale?: Locale;
}

export function PortfolioRenderer({
  cvData,
  showBranding = true,
  interactiveGeneratedLanding = true,
  locale = DEFAULT_LOCALE,
}: PortfolioRendererProps) {
  const isEn = locale === "en";
  const generatedHtml = buildRenderableGeneratedHtml(cvData);

  if (generatedHtml) {
    const previewHintText = isEn
      ? "Links are blocked in this preview. Use 'Full view' to navigate."
      : "En esta vista previa los enlaces están bloqueados. Usa 'Vista completa' para navegar.";
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
      hint.textContent = ${JSON.stringify(previewHintText)};
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

    const interactiveSandbox =
      "allow-scripts allow-forms allow-modals";
    const previewSandbox = "allow-scripts";

    return (
      <div className="relative min-h-screen bg-black">
        <iframe
          title={
            isEn
              ? `Generated landing for ${cvData.personal.name}`
              : `Landing generada de ${cvData.personal.name}`
          }
          srcDoc={
            interactiveGeneratedLanding ? generatedHtml : guardedPreviewHtml
          }
          className={cn(
            "w-full border-0",
            interactiveGeneratedLanding ? "h-screen" : "h-[78vh] min-h-[600px]"
          )}
          sandbox={interactiveGeneratedLanding ? interactiveSandbox : previewSandbox}
          referrerPolicy="no-referrer"
        />

        {!interactiveGeneratedLanding && (
          <div className="absolute top-3 right-3 rounded bg-black/70 text-white text-xs px-2.5 py-1.5 pointer-events-none">
            {isEn ? "Non-interactive preview" : "Vista previa no interactiva"}
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
            {isEn ? "Built with" : "Creado con"}{" "}
            <span className="font-display font-semibold">
              web<span className="text-[var(--rust)]">iculum</span>
            </span>
          </a>
        </footer>
      )}
    </div>
  );
}
