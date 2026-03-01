"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  ensureDetectedClientLocale,
  type Locale,
} from "@/lib/locale";

export function useClientLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const detectedLocale = ensureDetectedClientLocale();
    setLocale(detectedLocale);
  }, []);

  return locale;
}
