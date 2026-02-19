import { Award, ExternalLink } from "lucide-react";
import type { CVData } from "@/types/cv-data";

interface CertificationsSectionProps {
  certifications: CVData["certifications"];
}

export function CertificationsSection({
  certifications,
}: CertificationsSectionProps) {
  if (!certifications?.length) return null;

  return (
    <section>
      <div className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--muted-color)] font-medium mb-5">
        Certificaciones
      </div>

      <div className="space-y-3">
        {certifications.map((cert, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--sand)] hover:bg-[var(--cream)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(192,68,10,0.1)] flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4 text-[var(--rust)]" />
              </div>
              <div>
                <p className="font-medium text-[0.82rem] text-[var(--ink)]">
                  {cert.name}
                </p>
                <p className="text-[0.72rem] text-[var(--muted-color)]">
                  {cert.issuer} · {cert.date}
                </p>
              </div>
            </div>

            {cert.url && (
              <a
                href={cert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-[var(--muted-color)] hover:text-[var(--rust)] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
