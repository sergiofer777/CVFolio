"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";

interface PublicPortfolioButtonProps {
  canAccessPublic: boolean;
  portfolioId: string;
  billingHref: string;
  publicUrl: string;
  className?: string;
}

export function PublicPortfolioButton({
  canAccessPublic,
  portfolioId,
  billingHref,
  publicUrl,
  className,
}: PublicPortfolioButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeMessage, setFreeMessage] = useState<string | null>(null);

  if (!canAccessPublic) {
    const handleFreeClick = () => {
      setFreeMessage("Debes activar un plan de pago para publicar tu portfolio.");
      window.setTimeout(() => {
        router.push(billingHref);
      }, 900);
    };

    return (
      <div className="flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={handleFreeClick}
          className={
            className ??
            "inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-white border border-[var(--sand)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-colors"
          }
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ver portfolio público
        </button>
        {freeMessage && <p className="text-xs text-[var(--rust)]">{freeMessage}</p>}
      </div>
    );
  }

  const handleOpenPublished = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/portfolio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId }),
      });
      const data = (await response.json()) as {
        publicUrl?: string;
        subdomainUrl?: string;
        fallbackUrl?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo publicar este portfolio.");
      }

      const isLocalHost =
        window.location.hostname === "localhost" ||
        window.location.hostname.endsWith(".localhost");
      if (isLocalHost && data.fallbackUrl) {
        window.location.href = data.fallbackUrl;
        return;
      }

      window.location.href = data.subdomainUrl ?? data.publicUrl ?? publicUrl;
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "No se pudo publicar este portfolio."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleOpenPublished}
        disabled={isLoading}
        className={
          className ??
          "inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--rust)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        }
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ExternalLink className="w-3.5 h-3.5" />
        )}
        Ver portfolio público
      </button>
      {error && <p className="text-xs text-[var(--rust)]">{error}</p>}
    </div>
  );
}
