"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { useClientLocale } from "@/hooks/use-client-locale";

export default function NotFound() {
  const locale = useClientLocale();
  const isEn = locale === "en";
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="absolute top-4 right-4">
        <LocaleToggle locale={locale} />
      </div>
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <Sparkles className="w-6 h-6 text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground text-lg mb-2">{isEn ? "Page not found" : "Página no encontrada"}</p>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        {isEn ? "The portfolio you are looking for does not exist or is not published." : "El portafolio que buscas no existe o no está publicado."}
      </p>
      <Link href="/">
        <Button>{isEn ? "Back to home" : "Volver al inicio"}</Button>
      </Link>
    </div>
  );
}
