"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
            Bienvenido de nuevo
          </h1>
          <p className="text-[var(--muted-color)] text-sm mt-1 font-light">
            Inicia sesión en tu cuenta
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-[0.78rem] font-medium text-[var(--ink)] uppercase tracking-[0.06em]"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded bg-white border border-[var(--sand)] text-[var(--ink)] text-sm placeholder:text-[var(--muted-color)] focus:outline-none focus:border-[var(--rust)] focus:ring-1 focus:ring-[var(--rust)] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-[0.78rem] font-medium text-[var(--ink)] uppercase tracking-[0.06em]"
              htmlFor="password"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded bg-white border border-[var(--sand)] text-[var(--ink)] text-sm placeholder:text-[var(--muted-color)] focus:outline-none focus:border-[var(--rust)] focus:ring-1 focus:ring-[var(--rust)] transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--rust)] bg-[rgba(192,68,10,0.08)] px-3 py-2 rounded">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded bg-[var(--ink)] text-[var(--paper)] font-medium text-sm hover:bg-[var(--rust)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted-color)]">
          ¿No tienes cuenta?{" "}
          <Link
            href="/signup"
            className="text-[var(--rust)] font-medium hover:underline no-underline"
          >
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
