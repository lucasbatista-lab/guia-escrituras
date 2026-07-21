"use client";

import { useId, useMemo, useState } from "react";
import {
  HELP_FAQ,
  SUPPORT_CATEGORIES,
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

      {!query.trim() ? (
        <nav aria-label="Categorias da FAQ" className="flex flex-wrap gap-2">
          {SUPPORT_CATEGORIES.map((cat) => (
            <a
              key={cat.id}
              href={`#faq-${cat.id}`}
              className="inline-flex min-h-11 items-center rounded-lg border border-border/70 px-3 text-sm text-ink-soft hover:bg-sand-50 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {cat.label}
            </a>
          ))}
        </nav>
      ) : null}

      {groups.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-border/70 bg-card/60 px-4 py-4" role="status">
          <p className="text-sm text-ink-soft">
            Nenhuma pergunta encontrada para “{query.trim()}”. O suporte por
            e-mail não é aconselhamento pastoral.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-lg border border-border/70 px-3 text-sm text-ink hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={() => setQuery("")}
            >
              Limpar busca
            </button>
            {SUPPORT_CATEGORIES.slice(0, 4).map((cat) => (
              <a
                key={cat.id}
                href={`#contato-${cat.id}`}
                className="inline-flex min-h-11 items-center rounded-lg border border-border/70 px-3 text-sm text-ink-soft hover:bg-sand-50 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {cat.label}
              </a>
            ))}
            <a
              href="#contato"
              className="inline-flex min-h-11 items-center rounded-lg border border-border/70 px-3 text-sm text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Ver categorias de contato
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.category} id={`faq-${group.category}`}>
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
