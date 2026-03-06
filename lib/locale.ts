export type Locale = "es" | "en";

export const LOCALE_COOKIE_NAME = "webiculum-locale";
export const DEFAULT_LOCALE: Locale = "en";

export function normalizeLocale(value?: string | null): Locale {
  return detectLocaleFromLanguage(value) ?? DEFAULT_LOCALE;
}

export function detectLocaleFromLanguage(value?: string | null): Locale | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const candidates = normalized
    .split(",")
    .map((part) => part.trim().split(";")[0]?.trim() ?? "")
    .filter(Boolean)
    .map((tag) => tag.replace("_", "-"));

  for (const candidate of candidates) {
    if (candidate === "es" || candidate.startsWith("es-")) return "es";
    if (candidate === "en" || candidate.startsWith("en-")) return "en";
  }

  return null;
}

export function detectLocaleFromLanguageList(values: readonly string[]): Locale {
  for (const value of values) {
    const detected = detectLocaleFromLanguage(value);
    if (detected) return detected;
  }

  return DEFAULT_LOCALE;
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.split("=")[1] ?? "");
}

function getStoredClientLocale(): Locale | null {
  if (typeof window === "undefined") return null;

  const stored =
    window.localStorage.getItem(LOCALE_COOKIE_NAME) ?? getCookieValue(LOCALE_COOKIE_NAME);

  return stored ? normalizeLocale(stored) : null;
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  const candidates =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  return detectLocaleFromLanguageList(candidates.filter(Boolean));
}

export function getClientLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  return getStoredClientLocale() ?? detectBrowserLocale();
}

export function setClientLocale(locale: Locale): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  window.localStorage.setItem(LOCALE_COOKIE_NAME, locale);
}

export function ensureDetectedClientLocale(): Locale {
  const storedLocale = getStoredClientLocale();
  if (storedLocale) return storedLocale;

  const detectedLocale = detectBrowserLocale();
  setClientLocale(detectedLocale);
  return detectedLocale;
}
