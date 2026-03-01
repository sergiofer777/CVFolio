"use client";

import { type FormEvent, useState } from "react";
import { Globe2, Loader2 } from "lucide-react";
import { useClientLocale } from "@/hooks/use-client-locale";

interface DomainRequestResponse {
  request?: { requested_domain?: string; status?: string };
  error?: string;
}

export function CustomDomainRequest() {
  const locale = useClientLocale();
  const isEn = locale === "en";
  const [domain, setDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/domains/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = (await response.json()) as DomainRequestResponse;

      if (!response.ok) {
        throw new Error(
          data.error ??
            (isEn
              ? "The request could not be submitted."
              : "No se pudo registrar la solicitud.")
        );
      }

      setMessage(
        isEn
          ? `Request received for ${data.request?.requested_domain ?? domain}.`
          : `Solicitud recibida para ${data.request?.requested_domain ?? domain}.`
      );
      setDomain("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEn
            ? "The request could not be submitted."
            : "No se pudo registrar la solicitud."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="border border-[var(--sand)] rounded-xl bg-white px-4 py-4 md:px-5 md:py-5"
    >
      <p className="text-xs uppercase tracking-[0.1em] text-[var(--rust)] font-medium mb-2">
        {isEn ? "Custom domain" : "Dominio personalizado"}
      </p>
      <p className="text-sm text-[var(--muted-color)] mb-4">
        {isEn ? (
          <>
            Request domain purchase via API. Example: <code>mybrand.com</code>
          </>
        ) : (
          <>
            Solicita compra desde la API. Ejemplo: <code>miweb.com</code>
          </>
        )}
      </p>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Globe2 className="w-4 h-4 text-[var(--muted-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder={isEn ? "yourbrand.com" : "tumarca.com"}
            required
            className="w-full h-11 rounded border border-[var(--sand)] bg-white pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 px-4 rounded bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--rust)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEn ? "Request domain" : "Solicitar dominio"}
        </button>
      </div>

      {message && <p className="mt-3 text-xs text-[rgb(10,125,70)]">{message}</p>}
      {error && <p className="mt-3 text-xs text-[var(--rust)]">{error}</p>}
    </form>
  );
}
