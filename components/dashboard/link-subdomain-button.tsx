"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";
import { useClientLocale } from "@/hooks/use-client-locale";

interface LinkSubdomainButtonProps {
  canAccessPublic: boolean;
  portfolioId: string;
  billingHref: string;
  publicUrl: string;
  className?: string;
}

interface PublishResponse {
  ok?: boolean;
  publicUrl?: string;
  subdomainUrl?: string;
  error?: string;
}

export function LinkSubdomainButton({
  canAccessPublic,
  portfolioId,
  billingHref,
  publicUrl,
  className,
}: LinkSubdomainButtonProps) {
  const router = useRouter();
  const locale = useClientLocale();
  const isEn = locale === "en";
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLink = async () => {
    setMessage(null);
    setError(null);

    if (!canAccessPublic) {
      router.push(billingHref);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/portfolio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId }),
      });
      const data = (await response.json()) as PublishResponse;

      if (!response.ok) {
        throw new Error(data.error ?? (isEn ? "Could not link the subdomain." : "No se pudo enlazar el subdominio."));
      }

      const linkedUrl = data.subdomainUrl ?? data.publicUrl ?? publicUrl;
      setMessage(
        isEn
          ? `Subdomain linked to the selected website: ${linkedUrl}`
          : `Subdominio enlazado a la web seleccionada: ${linkedUrl}`
      );
      router.refresh();
    } catch (linkError) {
      setError(
        linkError instanceof Error
          ? linkError.message
          : isEn
            ? "Could not link the subdomain."
            : "No se pudo enlazar el subdominio."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-[var(--sand)] rounded-xl bg-white px-4 py-4 md:px-5 md:py-5">
      <p className="text-xs uppercase tracking-[0.1em] text-[var(--rust)] font-medium mb-2">
        {isEn ? "Subdomain publishing" : "Publicación en subdominio"}
      </p>
      <p className="text-sm text-[var(--muted-color)] mb-4">
        {isEn
          ? "Apply the selected website to your custom subdomain."
          : "Aplica la web seleccionada a tu subdominio personalizado."}
      </p>

      <button
        type="button"
        onClick={handleLink}
        disabled={isLoading}
        className={
          className ??
          "h-11 px-4 rounded bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--rust)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        }
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
        {canAccessPublic
          ? isEn
            ? "Link to subdomain"
            : "Enlazar al subdominio"
          : isEn
            ? "Activate plan to link"
            : "Activar plan para enlazar"}
      </button>

      {message && <p className="mt-3 text-xs text-[rgb(10,125,70)]">{message}</p>}
      {error && <p className="mt-3 text-xs text-[var(--rust)]">{error}</p>}
    </div>
  );
}
