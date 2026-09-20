"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "amem.splash.seen";

const HONESTY_A =
  "Não é Jesus, pastor, terapeuta nem a voz de Deus";
const HONESTY_B = "Presença com limites honestos";

/**
 * Web/PWA splash — V17 motion 0→180→380→700ms.
 * First open: honesty A. Later opens (simple localStorage): honesty B.
 * Reduced motion: show final frame immediately.
 */
export function AmemSplash({
  forceHonesty,
  className,
  onDone,
  autoHideMs = 1600,
}: {
  forceHonesty?: "A" | "B";
  className?: string;
  onDone?: () => void;
  autoHideMs?: number;
}) {
  const [visible, setVisible] = useState(true);
  const [honesty, setHonesty] = useState<"A" | "B">(forceHonesty ?? "A");

  useEffect(() => {
    if (forceHonesty) {
      setHonesty(forceHonesty);
      return;
    }
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (seen === "1") {
        setHonesty("B");
      } else {
        setHonesty("A");
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    } catch {
      setHonesty("A");
    }
  }, [forceHonesty]);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 400 : autoHideMs;
    const id = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, ms);
    return () => window.clearTimeout(id);
  }, [autoHideMs, onDone]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Amém"
      aria-live="polite"
      className={cn(
        "fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[color:var(--amem-canvas)] px-10 text-center",
        className,
      )}
      data-amem-splash
      data-honesty={honesty}
    >
      <div aria-hidden className="amem-presence-light opacity-80" />
      <div className="relative z-10 flex flex-col items-center">
        <span className="amem-splash-sig amem-ink-sig block" />
        <h1 className="amem-splash-fade mt-[18px] text-[42px] font-bold tracking-[-0.04em] text-ink">
          Amém
        </h1>
        <p className="amem-splash-fade mt-3.5 max-w-[250px] text-[15px] leading-relaxed text-ink-soft">
          Presença diária.
          <br />
          Acompanhamento quando você quiser.
        </p>
        <p className="amem-splash-fade mt-9 max-w-[280px] text-xs leading-relaxed text-[color:var(--amem-mute)]">
          {honesty === "A" ? HONESTY_A : HONESTY_B}
        </p>
      </div>
    </div>
  );
}
