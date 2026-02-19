import { ExternalLink } from "lucide-react";
import type { CVData } from "@/types/cv-data";

interface ProjectsSectionProps {
  projects: CVData["projects"];
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  if (!projects?.length) return null;

  return (
    <section>
      <div className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--muted-color)] font-medium mb-5">
        Proyectos
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projects.map((project, index) => (
          <div
            key={index}
            className="group p-5 rounded-xl bg-[var(--paper)] border border-[var(--sand)] hover:bg-[var(--cream)] transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-display text-sm font-normal text-[var(--ink)] tracking-tight group-hover:text-[var(--rust)] transition-colors">
                {project.name}
              </h3>
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-[var(--muted-color)] hover:text-[var(--rust)] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <p className="text-[0.78rem] text-[var(--muted-color)] leading-relaxed mb-3 font-light">
              {project.description}
            </p>

            {project.technologies?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="bg-[var(--cream)] text-[var(--muted-color)] text-[0.68rem] px-2 py-0.5 rounded-full"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
