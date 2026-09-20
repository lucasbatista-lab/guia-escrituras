"use client";

import { useState } from "react";
import {
  DAILY_CHECKIN_LABELS,
  DAILY_CHECKIN_VALUES,
  type DailyCheckinValue,
} from "@/lib/daily";

function eventId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function InicioCheckinStrip({
  date,
  initialCheckin,
}: {
  date: string;
  initialCheckin: DailyCheckinValue | null;
}) {
  const [checkin, setCheckin] = useState<DailyCheckinValue | null>(initialCheckin);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function select(value: DailyCheckinValue) {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/daily/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          date,
          checkin: value,
          eventId: eventId("chk"),
        }),
      });
      if (!res.ok) throw new Error("fail");
      setCheckin(value);
      setStatus("Registrado. Só você vê isso.");
    } catch {
      setStatus("Não foi possível salvar agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="inicio-checkin-heading" className="amem-surface-field p-4">
      <p
        id="inicio-checkin-heading"
        className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft"
      >
        Como você chega
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {DAILY_CHECKIN_VALUES.map((value) => {
          const selected = checkin === value;
          return (
            <li key={value}>
              <button
                type="button"
                disabled={busy}
                aria-pressed={selected}
                onClick={() => void select(value)}
                className={`min-h-11 rounded-full border px-3.5 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected
                    ? "border-wine/40 bg-wine/10 font-medium text-ink"
                    : "border-border/70 bg-card/80 text-ink-soft hover:border-wine/25"
                }`}
              >
                {DAILY_CHECKIN_LABELS[value]}
              </button>
            </li>
          );
        })}
      </ul>
      {status ? (
        <p className="mt-2 text-xs text-ink-soft" aria-live="polite">
          {status}
        </p>
      ) : null}
    </section>
  );
}
