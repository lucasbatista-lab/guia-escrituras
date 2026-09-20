import Link from "next/link";
import { redirect } from "next/navigation";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
import { listPrayers } from "@/lib/workspace/prayers";
import { listPrivateEntries } from "@/lib/workspace/entries";
import { listSavedItems } from "@/lib/workspace/saved";
import {
  countMonthlyReflectionMoments,
  monthlyMomentsCopy,
} from "@/lib/workspace/moments";

export const dynamic = "force-dynamic";

function snip(text: string, max = 110): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function humanWhen(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

function dayLabel(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
    })
      .format(date)
      .replace(".", "")
      .toUpperCase();
  } catch {
    return "";
  }
}

export default async function EspacoPage() {
  const auth = await getAuthUserContext();
  if (!auth) redirect("/entrar?next=/espaco");

  const [prayers, entries, saved, count] = await Promise.all([
    listPrayers(auth.userId).catch(() => []),
    listPrivateEntries(auth.userId).catch(() => []),
    listSavedItems(auth.userId).catch(() => []),
    countMonthlyReflectionMoments(auth.userId),
  ]);
  const moments = monthlyMomentsCopy(count);

  type Recent = {
    kind: string;
    body: string;
    href: string;
    at: string;
  };
  const candidates: Recent[] = [];
  if (prayers[0]) {
    candidates.push({
      kind: "Oração",
      body: snip(prayers[0].body),
      href: "/espaco/oracoes",
      at: prayers[0].updatedAt || prayers[0].createdAt,
    });
  }
  const journal = entries.find(
    (e) => e.kind === "journal" || e.kind === "gratitude",
  );
  if (journal) {
    candidates.push({
      kind: journal.kind === "gratitude" ? "Gratidão" : "Diário",
      body: snip(journal.body),
      href: "/espaco/diario",
      at: journal.updatedAt || journal.createdAt,
    });
  }
  if (saved[0]) {
    candidates.push({
      kind: "Salvo",
      body: snip(saved[0].title),
      href: "/espaco/salvos",
      at: saved[0].createdAt,
    });
  }
  candidates.sort((a, b) => (a.at < b.at ? 1 : -1));
  const empty = candidates.length === 0;
  const stack = candidates.slice(0, 3);

  return (
    <div className="relative space-y-5 overflow-hidden">
      <PresenceLight size="sm" />
      <PaperGrain />

      <header className="relative z-10 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-sans text-[30px] font-bold tracking-[-0.035em] text-ink">
            Espaço
          </h1>
          <p className="mt-1 text-sm text-[color:var(--amem-mute)]">
            seu arquivo íntimo
          </p>
        </div>
        {moments ? (
          <p className="max-w-[40%] text-right text-xs text-ink-soft">{moments}</p>
        ) : null}
      </header>

      {empty ? (
        <div
          className="relative z-10 mx-1 mt-4 rounded-3xl px-5 py-9 text-center"
          style={{
            background: "rgba(235,231,225,0.45)",
            boxShadow: "inset 0 0 0 1px var(--amem-hairline)",
          }}
          data-espaco-state="empty"
        >
          <span className="amem-ink-sig mx-auto mb-5 block w-10 opacity-85" />
          <p className="mx-auto max-w-[280px] font-display text-[22px] font-semibold leading-snug text-ink">
            Este lugar vai guardar o que importa para você.
          </p>
          <p className="mt-3.5 text-[13px] leading-relaxed text-[color:var(--amem-mute)]">
            Ainda vazio — e isso é o começo, não um erro.
          </p>
          <div className="mx-auto mt-7 flex max-w-sm flex-col gap-2.5 px-2">
            <Button asChild variant="ritual" className="min-h-11 w-full font-bold">
              <Link href="/espaco/oracoes">Primeira oração</Link>
            </Button>
            <Button asChild variant="ghost" className="min-h-11 w-full">
              <Link href="/hoje">Começar pelo Hoje</Link>
            </Button>
          </div>
          {/* Keep Abrir Hoje for W5 contract / alternate entry */}
          <p className="sr-only">
            <Link href="/hoje">Abrir Hoje</Link>
          </p>
        </div>
      ) : (
        <>
          <div
            className="relative z-10 mx-1 h-[196px]"
            data-espaco-state="populated"
          >
            {stack[2] ? (
              <div
                className="absolute left-2.5 right-2.5 top-7 min-h-[128px] -rotate-[2.4deg] rounded-[20px] px-[18px] py-4 opacity-90"
                style={{ background: "#E8E3DB", boxShadow: "0 6px 16px var(--amem-shadow)" }}
              >
                <p className="text-[11px] font-semibold tracking-[0.04em] text-[color:var(--amem-mute)]">
                  {dayLabel(stack[2].at)}
                </p>
                <p className="mt-2 text-sm text-ink-soft">{snip(stack[2].body, 48)}</p>
              </div>
            ) : null}
            {stack[1] ? (
              <div
                className="absolute left-1.5 right-1.5 top-3.5 z-[1] min-h-[132px] rotate-[1.6deg] rounded-[20px] px-[18px] py-4 opacity-95"
                style={{ background: "#F3EFE8", boxShadow: "0 10px 28px var(--amem-shadow)" }}
              >
                <p className="text-[11px] font-semibold tracking-[0.04em] text-[color:var(--amem-mute)]">
                  {dayLabel(stack[1].at)} · {stack[1].kind.toUpperCase()}
                </p>
                <p className="mt-2 text-sm text-ink-soft">{snip(stack[1].body, 48)}</p>
              </div>
            ) : null}
            <Link
              href={stack[0]!.href}
              className="amem-folha absolute inset-x-0 top-0 z-[2] min-h-[128px] -rotate-[0.5deg] px-[18px] py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-[11px] font-semibold tracking-[0.04em] text-[color:var(--amem-mute)]">
                {dayLabel(stack[0]!.at)} · {stack[0]!.kind.toUpperCase()}
              </p>
              <p className="mt-2.5 font-display text-[17px] italic leading-snug text-ink">
                “{snip(stack[0]!.body, 72)}”
              </p>
              <p className="mt-2.5 text-xs text-[color:var(--amem-mute)]">
                Ainda aberta · tocar para retomar
              </p>
            </Link>
          </div>

          <div className="relative z-10 px-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
              Linha viva
            </p>
            <p className="sr-only">Memória viva</p>
            <ul className="relative mt-3 space-y-0 pl-7">
              <span
                aria-hidden
                className="absolute bottom-6 left-[7px] top-2.5 w-[1.5px] opacity-28"
                style={{
                  background:
                    "linear-gradient(180deg, var(--amem-wine), var(--amem-plum), transparent)",
                }}
              />
              {candidates.map((item, idx) => (
                <li key={`${item.href}-${item.at}`} className="relative pb-[18px]">
                  <span
                    aria-hidden
                    className="absolute left-[-24px] top-1.5 h-[7px] w-[7px] rounded-full"
                    style={
                      idx === 0
                        ? {
                            background: "var(--amem-brass)",
                            boxShadow: "0 0 0 1.5px var(--amem-wine)",
                          }
                        : {
                            background: "var(--amem-canvas)",
                            boxShadow: "0 0 0 1.5px var(--amem-wine)",
                          }
                    }
                  />
                  <Link
                    href={item.href}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-[11px] font-semibold text-[color:var(--amem-mute)]">
                      {humanWhen(item.at)} · {item.kind.toLowerCase()}
                    </p>
                    <p className="mt-1 font-display text-[15px] italic leading-snug text-ink">
                      {item.body}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Áreas da memória" className="relative z-10 px-1 pt-2">
            <ul className="flex flex-wrap gap-2 text-sm">
              <li>
                <Link
                  href="/espaco/oracoes"
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-ink-soft underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Orações
                </Link>
              </li>
              <li>
                <Link
                  href="/espaco/diario"
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-ink-soft underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Diário
                </Link>
              </li>
              <li>
                <Link
                  href="/espaco/salvos"
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-ink-soft underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Salvos
                </Link>
              </li>
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
