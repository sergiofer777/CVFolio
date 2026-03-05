"use client";

import { type ReactNode, useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  className?: string;
  label?: ReactNode;
  labelClassName?: string;
}

export function LogoutButton({
  className,
  label = "Cerrar sesión",
  labelClassName,
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={
        className ??
        "inline-flex items-center gap-1.5 px-3 py-2 rounded border border-[var(--sand)] bg-white text-[var(--ink)] text-sm font-medium hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      }
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <LogOut className="w-3.5 h-3.5" />
      )}
      <span className={labelClassName}>{label}</span>
    </button>
  );
}
