import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/ai/chat-schema";

/** Legacy prefix (pre user-scope). Never rehydrate for a different account. */
const DRAFT_KEY_PREFIX_V1 = "amem:composer-draft:v1:";
/** User-scoped drafts — sessionStorage only. */
const DRAFT_KEY_PREFIX_V2 = "amem:composer-draft:v2:";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem"> &
  Partial<Pick<Storage, "key" | "length">>;

/**
 * Stable non-PII user segment for keys.
 * Rejects empty, email-like, and values that look like draft body text.
 */
export function normalizeDraftUserScope(
  userId: string | null | undefined,
): string | null {
  const raw = (userId ?? "").trim();
  if (!raw) return null;
  if (raw.includes("@")) return null;
  if (/\s/.test(raw)) return null;
  // UUIDs and demo ids (demo-user) — keep short opaque tokens only.
  if (raw.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  return raw;
}

function conversationScope(
  conversationId: string | null | undefined,
): string {
  const id = conversationId?.trim();
  return id && id.length > 0 ? id : "new";
}

/** @deprecated Prefer composerDraftStorageKey with userId (v2). */
export function composerDraftStorageKey(
  conversationId: string | null | undefined,
  userId?: string | null,
): string {
  const scope = conversationScope(conversationId);
  const user = normalizeDraftUserScope(userId);
  if (user) {
    return `${DRAFT_KEY_PREFIX_V2}${user}:${scope}`;
  }
  // Without a user id we never write; callers should pass userId.
  // Kept for test/compat expectations around the legacy shape.
  return `${DRAFT_KEY_PREFIX_V1}${scope}`;
}

export function composerDraftStorageKeyForUser(
  userId: string,
  conversationId: string | null | undefined,
): string | null {
  const user = normalizeDraftUserScope(userId);
  if (!user) return null;
  return `${DRAFT_KEY_PREFIX_V2}${user}:${conversationScope(conversationId)}`;
}

function legacyDraftStorageKey(
  conversationId: string | null | undefined,
): string {
  return `${DRAFT_KEY_PREFIX_V1}${conversationScope(conversationId)}`;
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

function listStorageKeys(store: StorageLike): string[] {
  const length = typeof store.length === "number" ? store.length : 0;
  const keys: string[] = [];
  if (typeof store.key !== "function" || length <= 0) return keys;
  for (let i = 0; i < length; i += 1) {
    const key = store.key(i);
    if (key) keys.push(key);
  }
  return keys;
}

/**
 * Best-effort legacy handling:
 * - If any other user's v2 keys exist, discard legacy (account-switch risk).
 * - If only legacy remains (post-upgrade same browser), migrate once into the
 *   current user's empty v2 slot, then delete legacy.
 * - Never leave a v1 key for a later user to read.
 */
function migrateOrDiscardLegacy(
  userId: string | null | undefined,
  conversationId: string | null | undefined,
  store: StorageLike,
): string {
  const legacyKey = legacyDraftStorageKey(conversationId);
  let legacyRaw: string | null = null;
  try {
    legacyRaw = store.getItem(legacyKey);
  } catch {
    return "";
  }
  if (legacyRaw == null) return "";

  const user = normalizeDraftUserScope(userId);
  const sanitized = sanitizeComposerDraft(legacyRaw);
  const v2Key =
    user != null
      ? composerDraftStorageKeyForUser(user, conversationId)
      : null;

  let foreignUserScoped = false;
  try {
    for (const key of listStorageKeys(store)) {
      if (!key.startsWith(DRAFT_KEY_PREFIX_V2)) continue;
      if (user && key.startsWith(`${DRAFT_KEY_PREFIX_V2}${user}:`)) continue;
      foreignUserScoped = true;
      break;
    }
  } catch {
    foreignUserScoped = true;
  }

  try {
    store.removeItem(legacyKey);
  } catch {
    // ignore
  }

  if (foreignUserScoped || !v2Key || !sanitized) return "";

  try {
    const existing = store.getItem(v2Key);
    if (existing != null && sanitizeComposerDraft(existing) !== "") {
      return "";
    }
    store.setItem(v2Key, sanitized);
    return sanitized;
  } catch {
    return "";
  }
}

function discardLegacyForConversation(
  conversationId: string | null | undefined,
  store: StorageLike,
): void {
  try {
    store.removeItem(legacyDraftStorageKey(conversationId));
  } catch {
    // ignore
  }
}

/** Drop any remaining unscoped v1 keys (cannot attribute safely). */
export function discardAllLegacyComposerDrafts(
  storage?: StorageLike | null,
): void {
  const store = storage ?? getSessionStorage();
  if (!store) return;
  try {
    const length = typeof store.length === "number" ? store.length : 0;
    const keys: string[] = [];
    if (typeof store.key === "function" && length > 0) {
      for (let i = 0; i < length; i += 1) {
        const key = store.key(i);
        if (key && key.startsWith(DRAFT_KEY_PREFIX_V1)) keys.push(key);
      }
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    // ignore
  }
}

export function readComposerDraft(
  conversationId: string | null | undefined,
  storage?: StorageLike | null,
  userId?: string | null,
): string {
  const store = storage ?? getSessionStorage();
  if (!store) return "";
  const v2Key = composerDraftStorageKeyForUser(userId ?? "", conversationId);
  if (!v2Key) {
    // Unauthenticated / invalid scope: discard legacy so it cannot leak later.
    try {
      store.removeItem(legacyDraftStorageKey(conversationId));
    } catch {
      // ignore
    }
    return "";
  }
  try {
    const scoped = sanitizeComposerDraft(store.getItem(v2Key));
    if (scoped) {
      discardLegacyForConversation(conversationId, store);
      return scoped;
    }
    return migrateOrDiscardLegacy(userId, conversationId, store);
  } catch {
    return "";
  }
}

export function writeComposerDraft(
  conversationId: string | null | undefined,
  text: string,
  storage?: StorageLike | null,
  userId?: string | null,
): void {
  const store = storage ?? getSessionStorage();
  if (!store) return;
  const key = composerDraftStorageKeyForUser(userId ?? "", conversationId);
  if (!key) return;
  const sanitized = sanitizeComposerDraft(text);
  try {
    // Legacy must not survive alongside user-scoped writes.
    store.removeItem(legacyDraftStorageKey(conversationId));
    if (conversationId) {
      store.removeItem(legacyDraftStorageKey(null));
    }
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
  userId?: string | null,
): void {
  const store = storage ?? getSessionStorage();
  if (!store) return;
  try {
    const key = composerDraftStorageKeyForUser(userId ?? "", conversationId);
    if (key) store.removeItem(key);
    store.removeItem(legacyDraftStorageKey(conversationId));
    if (conversationId) {
      const newKey = composerDraftStorageKeyForUser(userId ?? "", null);
      if (newKey) store.removeItem(newKey);
      store.removeItem(legacyDraftStorageKey(null));
    }
  } catch {
    // ignore
  }
}

/**
 * Remove composer drafts from sessionStorage (logout / privacy minimize).
 * Clears v2 keys for the given user when provided, all v2 keys when not,
 * and always clears legacy v1 keys.
 */
export function clearAllComposerDrafts(
  storage?: StorageLike | null,
  userId?: string | null,
): void {
  const store = storage ?? getSessionStorage();
  if (!store) return;
  const user = normalizeDraftUserScope(userId);
  try {
    const length = typeof store.length === "number" ? store.length : 0;
    const keys: string[] = [];
    if (typeof store.key === "function" && length > 0) {
      for (let i = 0; i < length; i += 1) {
        const key = store.key(i);
        if (!key) continue;
        if (key.startsWith(DRAFT_KEY_PREFIX_V1)) {
          keys.push(key);
          continue;
        }
        if (key.startsWith(DRAFT_KEY_PREFIX_V2)) {
          if (!user || key.startsWith(`${DRAFT_KEY_PREFIX_V2}${user}:`)) {
            keys.push(key);
          }
        }
      }
    }
    for (const key of keys) store.removeItem(key);
    if (user) {
      const newKey = composerDraftStorageKeyForUser(user, null);
      if (newKey) store.removeItem(newKey);
    } else {
      store.removeItem(legacyDraftStorageKey(null));
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
  userId?: string | null;
  storage?: StorageLike | null;
}): string {
  const fromUrl = sanitizeComposerDraft(options.urlDraft);
  if (fromUrl) return fromUrl;
  return readComposerDraft(
    options.conversationId ?? null,
    options.storage,
    options.userId,
  );
}

function getSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
