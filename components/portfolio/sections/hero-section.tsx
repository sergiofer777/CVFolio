import { Mail, Phone, MapPin, Globe, Linkedin, Github } from "lucide-react";
import type { CVData } from "@/types/cv-data";
import { getInitials } from "@/lib/utils";

interface HeroSectionProps {
  personal: CVData["personal"];
}

export function HeroSection({ personal }: HeroSectionProps) {
  const links = [
    personal.linkedin && {
      href: personal.linkedin,
      icon: Linkedin,
      label: "LinkedIn",
    },
    personal.github && {
      href: personal.github,
      icon: Github,
      label: "GitHub",
    },
    personal.website && {
      href: personal.website,
      icon: Globe,
      label: "Web",
    },
  ].filter(Boolean) as { href: string; icon: React.ElementType; label: string }[];

  const contacts = [
    personal.email && {
      icon: Mail,
      text: personal.email,
      href: `mailto:${personal.email}`,
    },
    personal.phone && {
      icon: Phone,
      text: personal.phone,
      href: `tel:${personal.phone}`,
    },
    personal.location && {
      icon: MapPin,
      text: personal.location,
      href: null,
    },
  ].filter(Boolean) as {
    icon: React.ElementType;
    text: string;
    href: string | null;
  }[];

  return (
    <section className="relative bg-[var(--ink)] text-[var(--paper)]">
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0 w-[72px] h-[72px] rounded-full bg-[var(--rust)] flex items-center justify-center">
            <span className="font-display text-[1.8rem] font-semibold text-[var(--paper)]">
              {getInitials(personal.name)}
            </span>
          </div>

          <div>
            {/* Name */}
            <h1 className="font-display text-[2rem] font-normal tracking-tight text-[var(--paper)] leading-tight">
              {personal.name}
            </h1>

            {/* Title */}
            <p className="text-[0.85rem] text-[var(--rust-light)] uppercase tracking-[0.06em] mt-1 mb-3">
              {personal.title}
            </p>

            {/* Contact */}
            <div className="flex flex-wrap gap-4">
              {contacts.map(({ icon: Icon, text, href }) =>
                href ? (
                  <a
                    key={text}
                    href={href}
                    className="flex items-center gap-1.5 text-[0.78rem] text-[var(--sand)] hover:text-white transition-colors no-underline"
                  >
                    <Icon className="w-3 h-3" />
                    {text}
                  </a>
                ) : (
                  <span
                    key={text}
                    className="flex items-center gap-1.5 text-[0.78rem] text-[var(--sand)]"
                  >
                    <Icon className="w-3 h-3" />
                    {text}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Social links */}
        {links.length > 0 && (
          <div className="flex gap-2 mt-5">
            {links.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors no-underline"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </a>
            ))}
          </div>
        )}

        {/* Summary */}
        {personal.summary && (
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-[var(--sand)] leading-relaxed text-[0.95rem] max-w-2xl font-light">
              {personal.summary}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
