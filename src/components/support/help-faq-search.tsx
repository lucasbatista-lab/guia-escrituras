"use client";

import { useId, useMemo, useState } from "react";
import {
  HELP_FAQ,
  filterHelpFaq,
  groupHelpFaqByCategory,
} from "@/lib/support/help-center";

export function HelpFaqSearch() {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterHelpFaq(query), [query]);
  const groups = useMemo(() => groupHelpFaqByCategory(filtered), [filtered]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          Buscar nas perguntas
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex.: senha, cancelar, Jornadas…"
          className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          autoComplete="off"
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-ink-soft" role="status">
          Nenhuma pergunta encontrada. Tente outro termo ou use o contato por
          categoria abaixo.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-ink-soft">
                {group.label}
              </h3>
              <ul className="mt-3 space-y-4">
                {group.items.map((item) => (
                  <li
                    key={item.q}
                    className="rounded-xl border border-border/70 px-4 py-3"
                  >
                    <h4 className="text-sm font-medium text-ink">{item.q}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {item.a}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-ink-soft" aria-live="polite">
        {filtered.length} de {HELP_FAQ.length} pergunta(s)
      </p>
    </div>
  );
}
