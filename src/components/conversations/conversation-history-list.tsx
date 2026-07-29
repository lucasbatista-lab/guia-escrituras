"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  conversationTitleLabel,
  formatConversationActivity,
} from "@/lib/conversations/display";
import {
  filterHistoryItems,
  groupConversationsByPeriod,
  type HistoryListItem,
} from "@/lib/conversations/history-list";
import { cn } from "@/lib/utils";

export function ConversationHistoryList({
  items,
  latestId,
  showLoadMore,
  loadMoreHref,
  initialQuery = "",
  atHardCap = false,
}: {
  items: HistoryListItem[];
  latestId: string | null;
  showLoadMore: boolean;
  loadMoreHref: string;
  initialQuery?: string;
  atHardCap?: boolean;
}) {
  const searchId = useId();
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(
    () => filterHistoryItems(items, query),
    [items, query],
  );
  const groups = useMemo(
    () => groupConversationsByPeriod(filtered),
    [filtered],
  );

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={searchId} className="sr-only">
          Buscar nas conversas carregadas
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no histórico carregado…"
            autoComplete="off"
            aria-describedby={`${searchId}-hint`}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3.5 text-base text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {query.trim() ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0"
              onClick={() => setQuery("")}
            >
              Limpar busca
            </Button>
          ) : null}
        </div>
        <p id={`${searchId}-hint`} className="mt-1.5 text-xs text-ink-soft">
          A busca filtra só as conversas já listadas nesta página
          {showLoadMore
            ? " — carregue mais abaixo se precisar ampliar o conjunto."
            : "."}
        </p>
        {query.trim() ? (
          <p className="mt-1 text-xs text-ink-soft" role="status">
            {filtered.length === 0
              ? `Nenhum resultado em ${items.length} conversa${items.length === 1 ? "" : "s"} carregada${items.length === 1 ? "" : "s"}.`
              : `${filtered.length} de ${items.length} conversa${items.length === 1 ? "" : "s"} carregada${items.length === 1 ? "" : "s"}.`}
          </p>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <div
          className="space-y-3 rounded-xl border border-border/70 bg-card/60 px-4 py-5"
          role="status"
        >
          <p className="text-sm text-ink-soft">
            Nenhuma conversa corresponde à busca nesta página.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setQuery("")}
            >
              Limpar busca
            </Button>
            <Button asChild className="min-h-11 bg-ink hover:bg-ink/90">
              <Link href="/conversar">Nova reflexão</Link>
            </Button>
            {showLoadMore ? (
              <Button asChild variant="outline" className="min-h-11">
                <Link href={loadMoreHref}>Carregar mais conversas</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.key}
              aria-labelledby={`hist-${group.key}`}
              role="region"
            >
              <h2
                id={`hist-${group.key}`}
                className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-soft"
              >
                {group.label}
                <span className="sr-only">
                  {`, ${group.items.length} conversa${group.items.length === 1 ? "" : "s"}`}
                </span>
              </h2>
              <ul className="space-y-2">
                {group.items.map((row) => {
                  const isLatest = row.id === latestId;
                  return (
                    <li key={row.id}>
                      <Link
                        href={`/conversar?c=${row.id}`}
                        className={cn(
                          "block min-h-11 rounded-xl border px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5 sm:py-3",
                          isLatest
                            ? "border-wine/30 bg-wine/[0.04] hover:border-wine/40"
                            : "border-border/70 bg-card/70 hover:border-wine/25 hover:bg-card",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-medium text-ink">
                              {conversationTitleLabel(row.title)}
                            </h3>
                            {row.preview ? (
                              <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                                {row.preview}
                              </p>
                            ) : null}
                          </div>
                          <time
                            dateTime={row.updatedAt}
                            className="shrink-0 text-xs text-ink-soft"
                          >
                            {formatConversationActivity(row.updatedAt)}
                          </time>
                        </div>
                        <p className={cn("mt-1.5 text-sm", isLatest ? "font-medium text-wine" : "text-ink-soft")}>
                          {isLatest ? "Continuar conversa" : "Retomar conversa"}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {showLoadMore && !query.trim() ? (
        <div className="pt-1">
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <Link href={loadMoreHref}>Carregar mais conversas</Link>
          </Button>
        </div>
      ) : null}

      {atHardCap ? (
        <p className="text-xs text-ink-soft" role="status">
          Mostrando até {items.length} conversas nesta página. A busca e a lista
          ficam limitadas ao que já foi carregado.
        </p>
      ) : null}
    </div>
  );
}
