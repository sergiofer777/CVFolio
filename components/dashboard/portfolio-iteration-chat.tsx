"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { useClientLocale } from "@/hooks/use-client-locale";
import { MinigameCanvas } from "@/components/upload/minigame-canvas";

interface PortfolioIterationChatProps {
  portfolioId: string;
  iterationsUsed: number;
  iterationsLimit: number | null;
  billingEnforced: boolean;
}

interface ApiResponse {
  ok?: boolean;
  message?: string;
  error?: string;
  iterationsUsed?: number;
  iterationsLimit?: number | null;
}

const CHAT_PROMPT_MAX_LENGTH = 200;

export function PortfolioIterationChat({
  portfolioId,
  iterationsUsed,
  iterationsLimit,
  billingEnforced,
}: PortfolioIterationChatProps) {
  const router = useRouter();
  const locale = useClientLocale();
  const isEn = locale === "en";
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localUsed, setLocalUsed] = useState(iterationsUsed);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalUsed(iterationsUsed);
    setMessage(null);
    setError(null);
  }, [portfolioId, iterationsUsed]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/portfolio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId,
          message: trimmed,
        }),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ??
            (isEn
              ? "The portfolio could not be updated."
              : "No se pudo iterar el portfolio.")
        );
      }

      setPrompt("");
      if (typeof data.iterationsUsed === "number") {
        setLocalUsed(data.iterationsUsed);
      } else {
        setLocalUsed((current) => current + 1);
      }
      setMessage(
        data.message ??
          (isEn
            ? "Changes were applied successfully."
            : "Iteración aplicada correctamente.")
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEn
            ? "The portfolio could not be updated."
            : "No se pudo iterar el portfolio."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const limitLabel =
    iterationsLimit === null
      ? isEn
        ? "Unlimited"
        : "Sin límite"
      : `${localUsed}/${iterationsLimit}`;
  const isLimitReached =
    iterationsLimit !== null && localUsed >= iterationsLimit;

  return (
    <section className="border border-[var(--sand)] rounded-xl bg-white p-4 md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--rust)] font-medium">
            {isEn ? "Iteration chat" : "Chat de iteración"}
          </p>
          <h3 className="font-display text-[1.1rem] text-[var(--ink)] tracking-tight mt-1">
            {isEn
              ? "Refine this site by chatting with AI"
              : "Ajusta esta web conversando con la IA"}
          </h3>
        </div>
        <div className="text-xs text-[var(--muted-color)]">
          {isEn ? "Iterations used:" : "Iteraciones usadas:"}{" "}
          <strong className="text-[var(--ink)]">{limitLabel}</strong>
        </div>
      </div>

      {!billingEnforced && (
        <p className="text-xs text-[var(--rust)] bg-[rgba(192,68,10,0.08)] border border-[rgba(192,68,10,0.18)] rounded px-3 py-2 mb-4">
          {isEn
            ? "Beta mode: chat is currently open to all accounts, although Studio sets a limit of 3 iterations per portfolio."
            : "Modo beta: el chat está abierto para todas las cuentas, aunque el plan Studio fija 3 iteraciones por portfolio."}
        </p>
      )}

      {isLimitReached && (
        <p className="text-xs text-[var(--rust)] bg-[rgba(192,68,10,0.08)] border border-[rgba(192,68,10,0.18)] rounded px-3 py-2 mb-4">
          {isEn
            ? "You have reached the iteration limit for this portfolio."
            : "Has alcanzado el límite de iteraciones para este portfolio."}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            isEn
              ? "Example: change the hero to highlight SAP BW and reduce the certifications block."
              : "Ejemplo: cambia el hero para destacar SAP BW y reduce el bloque de certificaciones."
          }
          rows={4}
          maxLength={CHAT_PROMPT_MAX_LENGTH}
          disabled={isLoading || isLimitReached}
          className="w-full rounded border border-[var(--sand)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)] resize-y min-h-[120px]"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted-color)]">
            {isEn
              ? "Describe specific content, layout or visual-focus changes."
              : "Describe cambios concretos de contenido, orden o foco visual."}
            <span
              className={`ml-2 ${
                prompt.length >= CHAT_PROMPT_MAX_LENGTH
                  ? "text-[var(--rust)]"
                  : "text-[var(--muted-color)]"
              }`}
            >
              {prompt.length}/{CHAT_PROMPT_MAX_LENGTH}
            </span>
          </p>
          <button
            type="submit"
            disabled={isLoading || isLimitReached || prompt.trim().length < 6}
            className="inline-flex items-center gap-2 rounded bg-[var(--ink)] text-[var(--paper)] px-4 py-2 text-sm font-medium hover:bg-[var(--rust)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isEn ? "Apply changes" : "Aplicar cambios"}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-5 border-t border-[var(--sand)] pt-4">
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--cream)] px-3 py-1.5 text-[0.72rem] font-medium uppercase tracking-[0.1em] text-[var(--rust)]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--rust)] animate-[pulseDot_1.2s_ease-in-out_infinite]"
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--rust)] animate-[pulseDot_1.2s_ease-in-out_infinite]"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--rust)] animate-[pulseDot_1.2s_ease-in-out_infinite]"
                  style={{ animationDelay: "0.3s" }}
                />
                {isEn ? "Applying changes" : "Aplicando cambios"}
              </div>
              <p className="mt-3 text-sm text-[var(--muted-color)]">
                {isEn
                  ? "We are rewriting the selected portfolio based on your request."
                  : "Estamos rehaciendo el portfolio seleccionado según tu petición."}
              </p>
            </div>

            <div className="max-w-4xl mx-auto w-full">
              <MinigameCanvas />
            </div>
          </div>
        </div>
      )}

      {!isLoading && message && (
        <p className="mt-3 text-xs text-[rgb(10,125,70)]">{message}</p>
      )}
      {!isLoading && error && (
        <p className="mt-3 text-xs text-[var(--rust)]">{error}</p>
      )}
    </section>
  );
}
