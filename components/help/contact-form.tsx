"use client";

import { useMemo, useState } from "react";
import { Mail, Send } from "lucide-react";

type ContactFormProps = {
  locale: "es" | "en";
  accessKey?: string;
};

const FALLBACK_WEB3FORMS_KEY = "e54654ce-670a-41ef-a7a1-cb1003850681";

export function ContactForm({ locale, accessKey }: ContactFormProps) {
  const isEn = locale === "en";
  const resolvedKey = accessKey?.trim() || FALLBACK_WEB3FORMS_KEY;
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const copy = useMemo(
    () => ({
      name: isEn ? "Name" : "Nombre",
      namePlaceholder: isEn ? "Your name" : "Tu nombre",
      emailPlaceholder: isEn ? "you@email.com" : "tu@email.com",
      message: isEn ? "Message" : "Mensaje",
      messagePlaceholder: isEn
        ? "Tell us your question and we will reply."
        : "Cuéntanos tu duda y te responderemos.",
      submit: isEn ? "Send message" : "Enviar mensaje",
      sending: isEn ? "Sending..." : "Enviando...",
      success: isEn
        ? "Message sent. We will reply as soon as possible."
        : "Mensaje enviado. Te responderemos lo antes posible.",
      genericError: isEn
        ? "Something went wrong. Please try again."
        : "Ha ocurrido un error. Inténtalo de nuevo.",
      helper: isEn
        ? "You can use this form for billing, publishing or website questions."
        : "Puedes usar este formulario para dudas sobre pagos, publicación o tu web.",
      subject: isEn
        ? "New message from the Webiculum help center"
        : "Nuevo mensaje desde el centro de ayuda de Webiculum",
      fromName: isEn ? "Webiculum help center" : "Centro de ayuda Webiculum",
    }),
    [isEn],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resolvedKey) {
      setStatus("error");
      setErrorMessage(copy.genericError);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    formData.set("access_key", resolvedKey);
    formData.set("subject", copy.subject);
    formData.set("from_name", copy.fromName);

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || copy.genericError);
      }

      form.reset();
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error && error.message ? error.message : copy.genericError,
      );
    }
  }

  return (
    <>
      {status === "success" && (
        <p className="mb-4 rounded-xl border border-[rgba(10,125,70,0.18)] bg-[rgba(10,125,70,0.06)] px-4 py-3 text-sm text-[rgb(10,125,70)]">
          {copy.success}
        </p>
      )}

      {status === "error" && (
        <p className="mb-4 rounded-xl border border-[rgba(192,68,10,0.18)] bg-[rgba(192,68,10,0.06)] px-4 py-3 text-sm text-[var(--rust)]">
          {errorMessage || copy.genericError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="access_key" value={resolvedKey} />
        <input type="hidden" name="subject" value={copy.subject} />
        <input type="hidden" name="from_name" value={copy.fromName} />
        <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

        <label className="block">
          <span className="mb-2 block text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[var(--muted-color)]">
            {copy.name}
          </span>
          <input
            type="text"
            name="name"
            required
            className="h-11 w-full rounded-xl border border-[var(--sand)] bg-white px-4 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--ink)]"
            placeholder={copy.namePlaceholder}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[var(--muted-color)]">
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            className="h-11 w-full rounded-xl border border-[var(--sand)] bg-white px-4 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--ink)]"
            placeholder={copy.emailPlaceholder}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[var(--muted-color)]">
            {copy.message}
          </span>
          <textarea
            name="message"
            required
            rows={5}
            className="w-full rounded-2xl border border-[var(--sand)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--ink)]"
            placeholder={copy.messagePlaceholder}
          />
        </label>

        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-medium text-[var(--paper)] transition-colors hover:bg-[var(--rust)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Send className="h-4 w-4" />
          {status === "sending" ? copy.sending : copy.submit}
        </button>
      </form>

      <div className="mt-4 rounded-xl bg-[var(--cream)] px-4 py-3 text-sm text-[var(--muted-color)]">
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <Mail className="h-4 w-4 text-[var(--rust)]" />
          {copy.helper}
        </div>
      </div>
    </>
  );
}
