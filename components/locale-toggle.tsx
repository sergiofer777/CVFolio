"use client";

import { setClientLocale, type Locale } from "@/lib/locale";

interface LocaleToggleProps {
  locale: Locale;
  className?: string;
}

export function LocaleToggle({ locale, className }: LocaleToggleProps) {
  const handleChange = (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    setClientLocale(nextLocale);
    window.location.reload();
  };

  return (
    <div
      className={
        className ??
        "inline-flex items-center rounded-2xl border border-[var(--sand)] bg-white p-1"
      }
    >
      {(["es", "en"] as const).map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => handleChange(option)}
            className={`rounded-xl px-2.5 py-1 text-[0.72rem] font-medium uppercase tracking-[0.08em] transition-colors ${
              active
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "text-[var(--muted-color)] hover:text-[var(--ink)]"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
