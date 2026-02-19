import type { CVData } from "@/types/cv-data";

interface ExperienceSectionProps {
  experience: CVData["experience"];
}

export function ExperienceSection({ experience }: ExperienceSectionProps) {
  if (!experience?.length) return null;

  return (
    <section>
      <div className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--muted-color)] font-medium mb-5">
        Experiencia
      </div>

      <div className="space-y-0">
        {experience.map((job, index) => (
          <div
            key={index}
            className="pb-5 mb-5 border-b border-[var(--cream)] last:border-b-0 last:mb-0 last:pb-0"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1">
              <div className="font-display text-base font-normal text-[var(--ink)] tracking-tight">
                {job.role}
              </div>
              <span className="text-[0.72rem] text-[var(--muted-color)] whitespace-nowrap">
                {job.startDate} — {job.endDate}
              </span>
            </div>

            <div className="text-[0.82rem] text-[var(--rust)] mb-2">
              {job.company}
              {job.location && ` · ${job.location}`}
            </div>

            {job.description?.length > 0 && (
              <div className="text-[0.82rem] text-[var(--muted-color)] leading-[1.6] font-light">
                {job.description.map((bullet, i) => (
                  <p key={i} className="mb-1 last:mb-0">
                    {bullet}
                  </p>
                ))}
              </div>
            )}

            {job.technologies && job.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {job.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="bg-[var(--paper)] border border-[var(--sand)] text-[var(--ink)] text-[0.72rem] px-2.5 py-1 rounded-full"
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
