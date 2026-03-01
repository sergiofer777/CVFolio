"use client";

import { type ReactNode, useState } from "react";
import { Loader2 } from "lucide-react";
import { useClientLocale } from "@/hooks/use-client-locale";
import { cn } from "@/lib/utils";

type CheckoutPlan = "publish" | "studio";

interface CheckoutButtonProps {
  plan: CheckoutPlan;
  portfolioId?: string;
  className?: string;
  children: ReactNode;
}

export function CheckoutButton({
  plan,
  portfolioId,
  className,
  children,
}: CheckoutButtonProps) {
  const locale = useClientLocale();
  const isEn = locale === "en";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, portfolioId }),
      });

      if (res.status === 401) {
        window.location.href = "/login?redirectTo=/dashboard";
        return;
      }

      const data = (await res.json()) as {
        checkoutUrl?: string;
        fallbackUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(
          data.error ?? (isEn ? "Could not open checkout." : "No se pudo abrir el pago.")
        );
      }

      const isLocalHost =
        window.location.hostname === "localhost" ||
        window.location.hostname.endsWith(".localhost");
      if (isLocalHost && data.fallbackUrl) {
        window.location.href = data.fallbackUrl;
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEn
            ? "Could not start checkout."
            : "Error al iniciar checkout."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCheckout}
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
