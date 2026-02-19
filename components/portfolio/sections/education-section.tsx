import type { CVData } from "@/types/cv-data";

interface EducationSectionProps {
  education: CVData["education"];
}

export function EducationSection({ education }: EducationSectionProps) {
  if (!education?.length) return null;

  return (
    <section>
      <div className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--muted-color)] font-medium mb-5">
        Educación
      </div>

      <div className="space-y-0">
        {education.map((edu, index) => (
          <div
            key={index}
            className="pb-4 mb-4 border-b border-[var(--cream)] last:border-b-0 last:mb-0 last:pb-0"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1">
              <div className="font-display text-sm font-normal text-[var(--ink)] tracking-tight">
                {edu.degree} en {edu.field}
              </div>
              <span className="text-[0.72rem] text-[var(--muted-color)] whitespace-nowrap">
                {edu.startDate} — {edu.endDate}
              </span>
            </div>

            <div className="text-[0.82rem] text-[var(--rust)]">
              {edu.institution}
            </div>

            {edu.gpa && (
              <p className="text-xs text-[var(--muted-color)] mt-1">
                Nota media: {edu.gpa}
              </p>
            )}

            {edu.achievements && edu.achievements.length > 0 && (
              <div className="text-[0.82rem] text-[var(--muted-color)] leading-[1.6] font-light mt-2">
                {edu.achievements.map((achievement, i) => (
                  <p key={i} className="mb-0.5 last:mb-0">
                    {achievement}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
