"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Shield } from "lucide-react";
import { Dropzone } from "@/components/upload/dropzone";

const FEATURES = [
  {
    icon: Zap,
    title: "Análisis instantáneo",
    description: "Gemini 2.5 Pro lee y estructura tu CV en segundos.",
  },
  {
    icon: Shield,
    title: "100% privado",
    description: "Tu información solo es tuya. Sin acceso de terceros.",
  },
];

export default function UploadPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (portfolioId: string) => {
    router.push(`/dashboard?portfolioId=${portfolioId}&new=true`);
  };

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="border-b border-[var(--sand)] px-6 md:px-12 py-5">
        <Link
          href="/"
          className="font-display text-xl font-semibold text-[var(--ink)] tracking-tight no-underline"
        >
          CV<span className="text-[var(--rust)]">folio</span>
        </Link>
      </header>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-2xl space-y-10">
          {/* Title */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium">
              <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
              Powered by Gemini 2.5 Pro
              <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
            </div>
            <h1 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-light tracking-tight text-[var(--ink)] leading-[1.1]">
              Sube tu CV,
              <br />
              <em className="italic text-[var(--rust)]">obtén tu portafolio</em>
            </h1>
            <p className="text-[var(--muted-color)] text-[1.05rem] max-w-md mx-auto font-light leading-[1.7]">
              Arrastra tu currículum y en segundos tendrás una página web
              profesional lista para compartir.
            </p>
          </div>

          {/* Dropzone */}
          <Dropzone
            onUploadComplete={handleUploadComplete}
            onError={(err) => setError(err)}
          />

          {/* Error */}
          {error && (
            <div className="max-w-md mx-auto rounded-lg bg-[rgba(192,68,10,0.08)] border border-[rgba(192,68,10,0.2)] px-4 py-3 text-sm text-[var(--rust)] text-center">
              {error}
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto sm:max-w-none">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col items-center text-center gap-3 p-6 rounded-xl bg-white border border-[var(--sand)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <div className="w-10 h-10 rounded-[10px] bg-[var(--paper)] flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
                  <Icon className="w-5 h-5 text-[var(--rust)]" />
                </div>
                <p className="font-display text-sm font-normal text-[var(--ink)]">
                  {title}
                </p>
                <p className="text-xs text-[var(--muted-color)] leading-relaxed font-light">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
