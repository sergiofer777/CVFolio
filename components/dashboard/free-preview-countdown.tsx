"use client";

import { useEffect, useMemo, useState } from "react";

interface FreePreviewCountdownProps {
  expiresAtIso: string;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}

export function FreePreviewCountdown({ expiresAtIso }: FreePreviewCountdownProps) {
  const expiresAt = useMemo(() => new Date(expiresAtIso).getTime(), [expiresAtIso]);
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const diffMs = expiresAt - Date.now();
    return Math.max(0, Math.floor(diffMs / 1000));
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const diffMs = expiresAt - Date.now();
      setRemainingSeconds(Math.max(0, Math.floor(diffMs / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  return (
    <span className="inline-flex items-center gap-1.5 rounded bg-[rgba(0,0,0,0.06)] px-2 py-0.5 font-mono text-[0.8rem] text-[var(--ink)]">
      {formatCountdown(remainingSeconds)}
    </span>
  );
}
