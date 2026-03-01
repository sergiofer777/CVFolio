"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, getClientLocale, type Locale } from "@/lib/locale";

export function useClientLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(getClientLocale());
  }, []);

  return locale;
}
