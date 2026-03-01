import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  detectLocaleFromLanguage,
  normalizeLocale,
  type Locale,
} from "@/lib/locale";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (value) return normalizeLocale(value);

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");

  return detectLocaleFromLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}
