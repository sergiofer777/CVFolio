import Link from "next/link";

type LegalSection = {
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
  highlight?: boolean;
};

interface LegalPageShellProps {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  lastUpdatedLabel: string;
  sections: readonly LegalSection[];
  navPrivacyLabel: string;
  navTermsLabel: string;
  navHomeLabel: string;
  footerText: string;
  helpLinkLabel: string;
}

export function LegalPageShell({
  eyebrow,
  title,
  intro,
  lastUpdated,
  lastUpdatedLabel,
  sections,
  navPrivacyLabel,
  navTermsLabel,
  navHomeLabel,
  footerText,
  helpLinkLabel,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--sand)] bg-[rgba(245,242,235,0.92)] backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-display text-[1.3rem] font-semibold text-[var(--ink)] tracking-tight no-underline"
          >
            web<span className="text-[var(--rust)]">iculum</span>
          </Link>
          <nav className="flex items-center gap-5 text-[0.8rem] text-[var(--muted-color)]">
            <Link
              href="/privacidad"
              className="hover:text-[var(--ink)] transition-colors no-underline"
            >
              {navPrivacyLabel}
            </Link>
            <Link
              href="/terminos"
              className="hover:text-[var(--ink)] transition-colors no-underline"
            >
              {navTermsLabel}
            </Link>
            <Link
              href="/"
              className="hover:text-[var(--ink)] transition-colors no-underline"
            >
              {navHomeLabel}
            </Link>
          </nav>
        </div>
      </header>

      <main className="px-6 md:px-12 py-14 md:py-20">
        <div className="max-w-4xl mx-auto">
          <section className="mb-10 md:mb-14">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-10 h-px bg-[var(--rust)]" />
              <span className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted-color)]">
                {eyebrow}
              </span>
            </div>

            <h1 className="font-display text-[clamp(2.3rem,5vw,4.5rem)] font-light tracking-tight leading-[1.05] mb-4">
              {title}
            </h1>
            <p className="max-w-3xl text-[0.98rem] md:text-[1.04rem] text-[var(--muted-color)] font-light leading-7">
              {intro}
            </p>
            <p className="mt-5 text-[0.78rem] uppercase tracking-[0.16em] text-[var(--muted-color)]">
              {lastUpdatedLabel}: {lastUpdated}
            </p>
          </section>

          <div className="grid gap-5">
            {sections.map((section) => (
              <section
                key={section.title}
                className={`rounded-2xl p-7 md:p-9 border shadow-[0_10px_30px_rgba(0,0,0,0.04)] ${
                  section.highlight
                    ? "bg-[var(--cream)] border-[rgba(192,68,10,0.24)]"
                    : "bg-white border-[var(--sand)]"
                }`}
              >
                <h2 className="font-display text-[1.6rem] md:text-[1.9rem] font-light tracking-tight mb-4">
                  {section.title}
                </h2>

                <div className="flex flex-col gap-3.5">
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-[0.96rem] text-[var(--muted-color)] font-light leading-7"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="mt-5 flex flex-col gap-3 list-none p-0">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-3 text-[0.94rem] text-[var(--muted-color)] leading-6"
                      >
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--rust)] flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--sand)] px-6 md:px-12 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[0.82rem] text-[var(--muted-color)]">
          <p>{footerText}</p>
          <Link
            href="/ayuda"
            className="text-[var(--ink)] hover:text-[var(--rust)] transition-colors no-underline"
          >
            {helpLinkLabel}
          </Link>
        </div>
      </footer>
    </div>
  );
}
