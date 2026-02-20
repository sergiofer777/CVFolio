"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/upload`,
      },
    });
    if (authError) {
      setError("Error al conectar con Google. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block font-display text-2xl font-semibold text-[var(--ink)] tracking-tight no-underline mb-8"
          >
            CV<span className="text-[var(--rust)]">folio</span>
          </Link>
          <h1 className="font-display text-[2rem] font-light tracking-tight text-[var(--ink)]">
            Crea tu cuenta
          </h1>
          <p className="text-[var(--muted-color)] text-sm mt-2 font-light">
            Gratis para siempre. Sin tarjeta de crédito.
          </p>
        </div>

        {error && (
          <p className="text-sm text-[var(--rust)] bg-[rgba(192,68,10,0.08)] px-3 py-2 rounded text-center">
            {error}
          </p>
        )}

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded bg-white border border-[var(--sand)] text-[var(--ink)] text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all disabled:opacity-50 shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
          {loading ? "Redirigiendo..." : "Continuar con Google"}
        </button>

        <p className="text-center text-xs text-[var(--muted-color)] font-light leading-relaxed">
          Al continuar aceptas nuestros{" "}
          <a href="#" className="underline hover:text-[var(--ink)] transition-colors">Términos de uso</a>
          {" "}y{" "}
          <a href="#" className="underline hover:text-[var(--ink)] transition-colors">Política de privacidad</a>.
        </p>

        <p className="text-center text-sm text-[var(--muted-color)]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-[var(--rust)] font-medium hover:underline no-underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
