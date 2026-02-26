"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type CheckoutPlan = "publish" | "studio";

interface CheckoutRedirectProps {
  plan: CheckoutPlan;
  portfolioId?: string;
}

export function CheckoutRedirect({ plan, portfolioId }: CheckoutRedirectProps) {
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const startCheckout = async () => {
      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, portfolioId }),
        });

        if (response.status === 401) {
          window.location.href = "/login?redirectTo=/checkout?plan=" + plan;
          return;
        }

        const data = (await response.json()) as {
          checkoutUrl?: string;
          fallbackUrl?: string;
          error?: string;
        };
        if (!response.ok || !data.checkoutUrl) {
          throw new Error(data.error ?? "No se pudo abrir el checkout.");
        }

        const isLocalHost =
          window.location.hostname === "localhost" ||
          window.location.hostname.endsWith(".localhost");
        if (isLocalHost && data.fallbackUrl) {
          window.location.href = data.fallbackUrl;
          return;
        }

        window.location.href = data.checkoutUrl;
      } catch (checkoutError) {
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : "No se pudo iniciar el checkout."
        );
      }
    };

    void startCheckout();
  }, [plan, portfolioId]);

  return (
    <main className="min-h-screen bg-[var(--paper)] flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-xl border border-[var(--sand)] bg-white p-6 text-center">
        {!error ? (
          <>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--cream)]">
              <Loader2 className="w-5 h-5 text-[var(--rust)] animate-spin" />
            </div>
            <h1 className="mt-4 font-display text-[1.5rem] text-[var(--ink)] tracking-tight">
              Iniciando pago
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-color)]">
              Te estamos redirigiendo a la pantalla de pago.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[1.5rem] text-[var(--ink)] tracking-tight">
              No se pudo iniciar el pago
            </h1>
            <p className="mt-2 text-sm text-[var(--rust)]">{error}</p>
            <Link
              href="/dashboard/billing"
              className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--rust)] transition-colors no-underline"
            >
              Volver a planes
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
