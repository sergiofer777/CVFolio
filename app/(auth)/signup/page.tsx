"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/upload`,
      },
    });

    if (authError) {
      setError(
        authError.message === "User already registered"
          ? "Este email ya está registrado. Prueba a iniciar sesión."
          : "Error al crear la cuenta. Inténtalo de nuevo."
      );
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(192,68,10,0.1)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-[var(--rust)]" />
          </div>
          <h2 className="font-display text-[2rem] font-light tracking-tight text-[var(--ink)]">
            ¡Revisa tu email!
          </h2>
          <p className="text-[var(--muted-color)] text-sm leading-relaxed font-light">
            Hemos enviado un enlace de confirmación a{" "}
            <span className="font-medium text-[var(--ink)]">{email}</span>. Haz
            clic en él para activar tu cuenta.
          </p>
          <Link
            href="/login"
            className="block w-full py-3.5 mt-4 text-center rounded bg-[var(--paper)] text-[var(--ink)] border-[1.5px] border-[var(--sand)] font-medium text-sm hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all no-underline"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

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
          <p className="text-[var(--muted-color)] text-sm mt-1 font-light">
            Gratis para siempre. Sin tarjeta de crédito.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
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
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
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
                Creando cuenta...
              </>
            ) : (
              "Crear cuenta gratis"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted-color)]">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-[var(--rust)] font-medium hover:underline no-underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
