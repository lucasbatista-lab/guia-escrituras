import Link from "next/link";
import { redirect } from "next/navigation";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { RitualMarker } from "@/components/brand/ritual-marker";
import { SurfaceScene } from "@/components/surfaces/scene";
import { ListRow } from "@/components/surfaces/list-row";
import { EmptyState } from "@/components/platform/empty-state";
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
  const recent = candidates[0] ?? null;
  const empty = !recent;

  const rows = [
    {
      href: "/espaco/oracoes",
      title: "Orações",
      meta:
        prayers.length === 0
          ? "Ainda em silêncio"
          : `${prayers.length} · última ${humanWhen(prayers[0]!.updatedAt || prayers[0]!.createdAt)}`,
    },
    {
      href: "/espaco/diario",
      title: "Diário",
      meta: journal
        ? `Entrada íntima · ${humanWhen(journal.updatedAt || journal.createdAt)}`
        : "Página em branco",
    },
    {
      href: "/espaco/salvos",
      title: "Salvos",
      meta:
        saved.length === 0
          ? "Coleção vazia"
          : `Coleção editorial · ${saved.length}`,
    },
  ] as const;

  return (
    <div className="relative space-y-6 overflow-hidden">
      <PresenceLight size="sm" />
      <PaperGrain />

      <header className="relative z-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
          <RitualMarker />
          Seu espaço
        </p>
        <h1 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
          Memória viva
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-soft">
          Orações, diário e salvos — um lugar íntimo, não uma lista fria.
        </p>
        {moments ? (
          <p className="mt-2 text-sm text-ink">{moments}</p>
        ) : null}
      </header>

      {empty ? (
        <div className="relative z-10">
          <EmptyState
            title="Ainda em branco"
            description="Quando você orar, escrever ou salvar algo de Hoje, a memória começa aqui."
            actionHref="/hoje"
            actionLabel="Abrir Hoje"
          />
        </div>
      ) : (
        <SurfaceScene className="relative z-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-gold-600,#A8843E)]">
            Recente · {recent!.kind}
          </p>
          <p className="mt-3 font-display text-lg leading-snug text-ink">
            “{recent!.body}”
          </p>
          <p className="mt-2 text-sm text-ink-soft">{humanWhen(recent!.at)}</p>
          <Link
            href={recent!.href}
            className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Abrir →
          </Link>
        </SurfaceScene>
      )}

      <nav aria-label="Áreas da memória" className="relative z-10">
        <ul>
          {rows.map((row) => (
            <li key={row.href}>
              <Link
                href={row.href}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ListRow className="py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-ink">{row.title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{row.meta}</p>
                  </div>
                  <span aria-hidden className="text-ink-soft">
                    →
                  </span>
                </ListRow>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="relative z-10 text-center text-sm text-ink-soft">
        Nada aqui é desempenho. É memória.
      </p>
    </div>
  );
}
