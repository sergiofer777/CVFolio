"use client";

import { type ReactNode, useState } from "react";
import { Loader2 } from "lucide-react";
import { useClientLocale } from "@/hooks/use-client-locale";
import { cn } from "@/lib/utils";

interface ManageSubscriptionButtonProps {
  className?: string;
  children: ReactNode;
}

export function ManageSubscriptionButton({
  className,
  children,
}: ManageSubscriptionButtonProps) {
  const locale = useClientLocale();
  const isEn = locale === "en";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManage = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.status === 401) {
        window.location.href = "/login?redirectTo=/dashboard/billing";
        return;
      }

      const data = (await res.json()) as {
        portalUrl?: string;
        error?: string;
      };

      if (!res.ok || !data.portalUrl) {
        throw new Error(
          data.error ??
            (isEn
              ? "Could not open subscription management."
              : "No se pudo abrir la gestión de suscripción.")
        );
      }

      window.location.href = data.portalUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEn
            ? "Could not open subscription management."
            : "No se pudo abrir la gestión de suscripción."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleManage}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed",
          className
        )}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
      {error && <p className="text-xs text-[var(--rust)]">{error}</p>}
    </div>
  );
}
