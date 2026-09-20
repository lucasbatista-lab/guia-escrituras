import Link from "next/link";
import { ListRow } from "@/components/surfaces/list-row";
import { listPrayers } from "@/lib/workspace/prayers";
import { listPrivateEntries } from "@/lib/workspace/entries";
import { listSavedItems } from "@/lib/workspace/saved";

export type MemoryItem = {
  kind: "prayer" | "journal" | "saved";
  href: string;
  label: string;
  snip: string;
};

function snipText(value: string, max = 72): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export async function loadRecentMemory(userId: string): Promise<MemoryItem[]> {
  const [prayers, entries, saved] = await Promise.all([
    listPrayers(userId).catch(() => []),
    listPrivateEntries(userId).catch(() => []),
    listSavedItems(userId).catch(() => []),
  ]);

  const items: Array<MemoryItem & { at: string }> = [];
  const prayer = prayers[0];
  if (prayer) {
    items.push({
      kind: "prayer",
      href: "/espaco/oracoes",
      label: "Oração",
      snip: snipText(prayer.body),
      at: prayer.updatedAt || prayer.createdAt,
    });
  }
  const entry = entries.find((e) => e.kind === "journal" || e.kind === "gratitude");
  if (entry) {
    items.push({
      kind: "journal",
      href: "/espaco/diario",
      label: "Diário",
      snip: snipText(entry.body),
      at: entry.updatedAt || entry.createdAt,
    });
  }
  const savedItem = saved[0];
  if (savedItem) {
    items.push({
      kind: "saved",
      href: "/espaco/salvos",
      label: "Salvo",
      snip: snipText(savedItem.title),
      at: savedItem.createdAt,
    });
  }

  return items
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 3)
    .map(({ at: _at, ...rest }) => rest);
}

export function MemoryStrip({
  items,
}: {
  items: MemoryItem[];
}) {
  return (
    <section aria-labelledby="memory-strip-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            Memória viva
          </p>
          <h2
            id="memory-strip-heading"
            className="font-display text-lg text-ink"
          >
            O que permanece
          </h2>
        </div>
        <Link
          href="/espaco"
          className="inline-flex min-h-11 items-center text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Espaço →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-base leading-relaxed text-ink-soft">
          Ainda em branco — quando você orar, escrever ou salvar, a memória
          começa aqui.{" "}
          <Link
            href="/hoje"
            className="font-medium text-ink underline-offset-4 hover:underline"
          >
            Abrir Hoje
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-border/50">
          {items.map((item) => (
            <li key={`${item.kind}-${item.href}`}>
              <Link
                href={item.href}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ListRow className="py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-base text-ink">
                      {item.snip}
                    </p>
                  </div>
                  <span aria-hidden className="text-ink-soft">
                    →
                  </span>
                </ListRow>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
