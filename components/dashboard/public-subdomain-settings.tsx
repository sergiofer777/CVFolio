"use client";

import { useState, type FormEvent } from "react";
import { Globe2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface PublicSubdomainSettingsProps {
  currentSlug: string;
  publicUrl: string;
}

interface SlugResponse {
  ok?: boolean;
  slug?: string;
  publicUrl?: string;
  error?: string;
}

export function PublicSubdomainSettings({
  currentSlug,
  publicUrl,
}: PublicSubdomainSettingsProps) {
  const router = useRouter();
  const [slug, setSlug] = useState(currentSlug);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveSlug = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/profile/public-slug", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await response.json()) as SlugResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar el subdominio.");
      }

      const nextUrl = data.publicUrl ?? publicUrl;
      setMessage(`Subdominio actualizado: ${nextUrl}`);
      if (data.slug) setSlug(data.slug);

      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el subdominio."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={saveSlug}
      className="border border-[var(--sand)] rounded-xl bg-white px-4 py-4 md:px-5 md:py-5"
    >
      <p className="text-xs uppercase tracking-[0.1em] text-[var(--rust)] font-medium mb-2">
        Subdominio público
      </p>
      <p className="text-sm text-[var(--muted-color)] mb-4">
        URL actual: <code>{publicUrl}</code>
      </p>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Globe2 className="w-4 h-4 text-[var(--muted-color)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
            placeholder="tu-subdominio"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-z0-9-]+"
            className="w-full h-11 rounded border border-[var(--sand)] bg-white pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="h-11 px-4 rounded bg-[var(--ink)] text-[var(--paper)] text-sm font-medium hover:bg-[var(--rust)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar subdominio
        </button>
      </div>

      {message && <p className="mt-3 text-xs text-[rgb(10,125,70)]">{message}</p>}
      {error && <p className="mt-3 text-xs text-[var(--rust)]">{error}</p>}
    </form>
  );
}
