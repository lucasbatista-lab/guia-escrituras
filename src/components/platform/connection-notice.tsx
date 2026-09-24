"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight offline/network notice. Does not claim offline sync.
 */
export function ConnectionNotice({ className }: { className?: string }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function sync() {
      setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-xl border border-border/70 bg-[color:var(--amem-recess)]/80 px-3 py-2.5 text-sm leading-relaxed text-ink",
        className,
      )}
    >
      Sem conexão no momento. Você pode ler o que já está aberto; ações que
      precisam do servidor voltam quando a rede retornar.
    </p>
  );
}
