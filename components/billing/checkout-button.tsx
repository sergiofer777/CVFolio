"use client";

import { type ReactNode, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckoutPlan = "publish" | "studio";

interface CheckoutButtonProps {
  plan: CheckoutPlan;
  portfolioId?: string;
  className?: string;
  children: ReactNode;
}

export function CheckoutButton({
  plan,
  portfolioId,
  className,
  children,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ plan });
    if (portfolioId) {
      params.set("portfolioId", portfolioId);
    }

    window.location.href = `/checkout?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed",
          className
        )}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    </div>
  );
}
