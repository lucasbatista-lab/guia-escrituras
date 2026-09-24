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

/** Loads recent Espaço snippets for Início continuity — UI strip removed. */
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
    .map(({ kind, href, label, snip }) => ({ kind, href, label, snip }));
}
