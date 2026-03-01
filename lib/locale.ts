export type Locale = "es" | "en";

export const LOCALE_COOKIE_NAME = "webiculum-locale";
export const DEFAULT_LOCALE: Locale = "es";

export function normalizeLocale(value?: string | null): Locale {
  return value === "en" ? "en" : "es";
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.split("=")[1] ?? "");
}

export function getClientLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored =
    window.localStorage.getItem(LOCALE_COOKIE_NAME) ?? getCookieValue(LOCALE_COOKIE_NAME);

  return normalizeLocale(stored);
}

export function setClientLocale(locale: Locale): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  window.localStorage.setItem(LOCALE_COOKIE_NAME, locale);
}
