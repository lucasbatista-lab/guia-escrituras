import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/ai/chat-schema";

const DRAFT_KEY_PREFIX = "amem:composer-draft:v1:";

/** sessionStorage key scoped to conversation or new thread. */
export function composerDraftStorageKey(
  conversationId: string | null | undefined,
): string {
  const id = conversationId?.trim();
  return `${DRAFT_KEY_PREFIX}${id && id.length > 0 ? id : "new"}`;
}

/** Cap drafts to the same limit as chat messages; strip control chars. */
export function sanitizeComposerDraft(raw: string | null | undefined): string {
  const cleaned = (raw ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trimStart();
  if (!cleaned) return "";
  if (cleaned.length <= MAX_CHAT_MESSAGE_LENGTH) return cleaned;
  return cleaned.slice(0, MAX_CHAT_MESSAGE_LENGTH);
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readComposerDraft(
  conversationId: string | null | undefined,
  storage?: StorageLike | null,
): string {
  const store = storage ?? getSessionStorage();
  if (!store) return "";
  try {
    return sanitizeComposerDraft(
      store.getItem(composerDraftStorageKey(conversationId)),
    );
  } catch {
    return "";
  }
}

export function writeComposerDraft(
  conversationId: string | null | undefined,
  text: string,
  storage?: StorageLike | null,
): void {
  const store = storage ?? getSessionStorage();
  if (!store) return;
  const key = composerDraftStorageKey(conversationId);
  const sanitized = sanitizeComposerDraft(text);
  try {
    if (!sanitized) {
      store.removeItem(key);
      return;
    }
    store.setItem(key, sanitized);
  } catch {
    // Quota / private mode — fail soft; draft is best-effort only.
  }
}

export function clearComposerDraft(
  conversationId: string | null | undefined,
  storage?: StorageLike | null,
): void {
  const store = storage ?? getSessionStorage();
  if (!store) return;
  try {
    store.removeItem(composerDraftStorageKey(conversationId));
    // Also clear the "new" bucket when a conversation id is assigned after send.
    if (conversationId) {
      store.removeItem(composerDraftStorageKey(null));
    }
  } catch {
    // ignore
  }
}

/**
 * Initial composer value: URL/tema/jornada draft wins; otherwise session draft.
 */
export function resolveInitialComposerInput(options: {
  urlDraft?: string | null;
  conversationId?: string | null;
  storage?: StorageLike | null;
}): string {
  const fromUrl = sanitizeComposerDraft(options.urlDraft);
  if (fromUrl) return fromUrl;
  return readComposerDraft(options.conversationId ?? null, options.storage);
}

function getSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
