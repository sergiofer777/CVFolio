"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { useClientLocale } from "@/hooks/use-client-locale";

type CheckoutPlan = "publish" | "studio";

interface EmbeddedCheckoutProps {
  plan: CheckoutPlan;
  portfolioId?: string;
}

type CheckoutSessionResponse = {
  clientSecret?: string;
  checkoutUrl?: string;
  fallbackUrl?: string;
  successRedirectUrl?: string;
  error?: string;
};

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

export function EmbeddedCheckoutScreen({
  plan,
  portfolioId,
}: EmbeddedCheckoutProps) {
  const locale = useClientLocale();
  const isEn = locale === "en";
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [successRedirectUrl, setSuccessRedirectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripePromise) {
      setError(
        isEn
          ? "Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY."
          : "Falta NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY."
      );
      return;
    }

    let isMounted = true;

    const createSession = async () => {
      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, portfolioId }),
        });

        if (response.status === 401) {
          const next =
            "/checkout?plan=" +
            plan +
            (portfolioId ? `&portfolioId=${encodeURIComponent(portfolioId)}` : "");
          window.location.href = `/login?redirectTo=${encodeURIComponent(next)}`;
          return;
        }

        const data = (await response.json()) as CheckoutSessionResponse;

        if (!response.ok) {
          throw new Error(
            data.error ??
              (isEn
                ? "Could not create the embedded checkout."
                : "No se pudo crear el checkout embebido.")
          );
        }

        if (data.checkoutUrl || data.fallbackUrl) {
          window.location.href = data.checkoutUrl ?? data.fallbackUrl ?? "/dashboard/billing";
          return;
        }

        if (!data.clientSecret) {
          throw new Error(
            isEn
              ? "Stripe did not return a client secret."
              : "Stripe no devolvió el client secret."
          );
        }

        if (!isMounted) return;
        setClientSecret(data.clientSecret);
        setSuccessRedirectUrl(data.successRedirectUrl ?? "/dashboard?billing=success");
      } catch (checkoutError) {
        if (!isMounted) return;
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : isEn
              ? "Could not start checkout."
              : "No se pudo iniciar el checkout."
        );
      }
    };

    void createSession();

    return () => {
      isMounted = false;
    };
  }, [isEn, plan, portfolioId]);

  const showLoader = !clientSecret && !error;

  return (
    <main className="min-h-screen bg-[var(--paper)] px-6 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link
            href="/dashboard/billing"
            className="text-sm text-[var(--muted-color)] hover:text-[var(--rust)] no-underline"
          >
            {isEn ? "Back to plans" : "Volver a planes"}
          </Link>
          <LocaleToggle locale={locale} />
        </div>

        <section className="rounded-2xl border border-[var(--sand)] bg-white p-4 md:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          {showLoader ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cream)]">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--rust)]" />
              </div>
              <h1 className="mt-4 font-display text-[1.7rem] tracking-tight text-[var(--ink)]">
                {isEn ? "Loading secure payment" : "Cargando pago seguro"}
              </h1>
              <p className="mt-2 max-w-md text-sm text-[var(--muted-color)]">
                {isEn
                  ? "We are preparing your embedded Stripe checkout."
                  : "Estamos preparando tu checkout embebido de Stripe."}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <h1 className="font-display text-[1.7rem] tracking-tight text-[var(--ink)]">
                {isEn ? "Could not load payment" : "No se pudo cargar el pago"}
              </h1>
              <p className="mt-3 text-sm text-[var(--rust)]">{error}</p>
            </div>
          ) : null}

          {clientSecret && stripePromise ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret,
                onComplete: () => {
                  window.location.href =
                    successRedirectUrl ?? "/dashboard?billing=success";
                },
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : null}
        </section>
      </div>
    </main>
  );
}
