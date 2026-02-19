import type { CVData } from "@/types/cv-data";

interface SkillsSectionProps {
  skills: CVData["skills"];
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  if (!skills) return null;

  const hasContent =
    (skills.technical && skills.technical.length > 0) ||
    (skills.soft && skills.soft.length > 0) ||
    (skills.languages && skills.languages.length > 0);

  if (!hasContent) return null;

  return (
    <section>
      <div className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--muted-color)] font-medium mb-5">
        Habilidades técnicas
      </div>

      <div className="space-y-5">
        {/* Technical */}
        {skills.technical && skills.technical.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.technical.map((skill) => (
              <span
                key={skill}
                className="bg-[var(--paper)] border border-[var(--sand)] text-[var(--ink)] text-[0.78rem] px-3.5 py-1.5 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Soft skills */}
        {skills.soft && skills.soft.length > 0 && (
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.08em] text-[var(--muted-color)] mb-2">
              Interpersonales
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skills.soft.map((skill) => (
                <span
                  key={skill}
                  className="bg-[var(--cream)] text-[var(--muted-color)] text-[0.72rem] px-3 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {skills.languages && skills.languages.length > 0 && (
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.08em] text-[var(--muted-color)] mb-2">
              Idiomas
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.languages.map(({ language, level }) => (
                <div
                  key={language}
                  className="flex items-center gap-2 bg-[var(--paper)] border border-[var(--sand)] px-3 py-1.5 rounded-full"
                >
                  <span className="text-[0.78rem] font-medium text-[var(--ink)]">
                    {language}
                  </span>
                  <span className="text-[0.68rem] text-[var(--muted-color)]">
                    {level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
