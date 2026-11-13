/**
 * Deterministic debounce / bundling for fragmented WhatsApp text.
 * No real timers — callers supply timestamps and window ms.
 */

export type DebounceInboundItem = {
  providerMessageId: string;
  externalSenderId: string;
  text: string;
  receivedAt: Date;
};

export type MessageBundle = {
  externalSenderId: string;
  providerMessageIds: string[];
  text: string;
  firstReceivedAt: Date;
  lastReceivedAt: Date;
  availableAfter: Date;
};

function compareItems(a: DebounceInboundItem, b: DebounceInboundItem): number {
  const ta = a.receivedAt.getTime();
  const tb = b.receivedAt.getTime();
  if (ta !== tb) return ta - tb;
  return a.providerMessageId.localeCompare(b.providerMessageId);
}

/**
 * Build bundles for a single sender's pending items.
 * - Dedupes by providerMessageId (first wins).
 * - Sorts by receivedAt then providerMessageId.
 * - Extends the open window when a new message arrives within debounceMs
 *   of the current bundle's lastReceivedAt.
 * - Messages after the window start a new bundle.
 *
 * Does not reopen a bundle once the caller marks it processed (caller
 * simply omits those message ids from the input set).
 */
export function buildBundlesForSender(input: {
  externalSenderId: string;
  items: DebounceInboundItem[];
  debounceMs: number;
}): MessageBundle[] {
  const seen = new Set<string>();
  const unique: DebounceInboundItem[] = [];
  for (const item of input.items) {
    if (item.externalSenderId !== input.externalSenderId) continue;
    if (seen.has(item.providerMessageId)) continue;
    seen.add(item.providerMessageId);
    unique.push(item);
  }
  unique.sort(compareItems);

  const bundles: MessageBundle[] = [];
  let current: DebounceInboundItem[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0]!;
    const last = current[current.length - 1]!;
    bundles.push({
      externalSenderId: input.externalSenderId,
      providerMessageIds: current.map((i) => i.providerMessageId),
      text: current.map((i) => i.text).join("\n"),
      firstReceivedAt: first.receivedAt,
      lastReceivedAt: last.receivedAt,
      availableAfter: new Date(last.receivedAt.getTime() + input.debounceMs),
    });
    current = [];
  };

  for (const item of unique) {
    if (current.length === 0) {
      current.push(item);
      continue;
    }
    const last = current[current.length - 1]!;
    const gap = item.receivedAt.getTime() - last.receivedAt.getTime();
    if (gap <= input.debounceMs) {
      current.push(item);
    } else {
      flush();
      current.push(item);
    }
  }
  flush();
  return bundles;
}

/**
 * Partition many senders into independent bundles (never mixed).
 */
export function buildBundles(input: {
  items: DebounceInboundItem[];
  debounceMs: number;
}): MessageBundle[] {
  const bySender = new Map<string, DebounceInboundItem[]>();
  for (const item of input.items) {
    const list = bySender.get(item.externalSenderId) ?? [];
    list.push(item);
    bySender.set(item.externalSenderId, list);
  }
  const all: MessageBundle[] = [];
  for (const [externalSenderId, items] of bySender) {
    all.push(
      ...buildBundlesForSender({
        externalSenderId,
        items,
        debounceMs: input.debounceMs,
      }),
    );
  }
  return all;
}

/** True when now >= availableAfter (bundle ready to claim). */
export function isBundleReady(bundle: MessageBundle, now: Date): boolean {
  return now.getTime() >= bundle.availableAfter.getTime();
}
