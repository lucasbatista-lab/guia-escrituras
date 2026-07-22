import { describe, expect, it } from "vitest";
import {
  clearAllComposerDrafts,
  clearComposerDraft,
  composerDraftStorageKey,
  composerDraftStorageKeyForUser,
  discardAllLegacyComposerDrafts,
  normalizeDraftUserScope,
  readComposerDraft,
  resolveInitialComposerInput,
  writeComposerDraft,
} from "@/lib/conversations/composer-draft";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CONV_1 = "11111111-1111-4111-8111-111111111111";
const CONV_2 = "22222222-2222-4222-8222-222222222222";

function memoryStorage(): {
  map: Map<string, string>;
  storage: Storage;
} {
  const map = new Map<string, string>();
  const storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(i: number) {
      return Array.from(map.keys())[i] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  } as Storage;
  return { map, storage };
}

describe("composer draft privacy cleanup", () => {
  it("clears all draft keys on logout helper", () => {
    const { map, storage } = memoryStorage();
    writeComposerDraft(null, "rascunho novo", storage, USER_A);
    writeComposerDraft(CONV_1, "rascunho conversa", storage, USER_A);
    expect(map.size).toBe(2);
    clearAllComposerDrafts(storage);
    expect(map.has(composerDraftStorageKey(null, USER_A))).toBe(false);
    expect(map.size).toBe(0);
  });
});

describe("composer drafts scoped by authenticated user", () => {
  it("rejects email and draft-like user scopes", () => {
    expect(normalizeDraftUserScope("user@example.com")).toBeNull();
    expect(normalizeDraftUserScope("texto com espaco")).toBeNull();
    expect(normalizeDraftUserScope(USER_A)).toBe(USER_A);
    expect(normalizeDraftUserScope("demo-user")).toBe("demo-user");
  });

  it("1) user A saves and recovers a draft", () => {
    const { storage } = memoryStorage();
    writeComposerDraft(null, "rascunho de A", storage, USER_A);
    expect(readComposerDraft(null, storage, USER_A)).toBe("rascunho de A");
  });

  it("2) user B on the same browser does not see A's draft", () => {
    const { storage } = memoryStorage();
    writeComposerDraft(null, "privado de A", storage, USER_A);
    expect(readComposerDraft(null, storage, USER_B)).toBe("");
    expect(readComposerDraft(null, storage, USER_A)).toBe("privado de A");
  });

  it("3) returning to A recovers draft while sessionStorage persists", () => {
    const { storage } = memoryStorage();
    writeComposerDraft(CONV_1, "ainda aqui", storage, USER_A);
    expect(readComposerDraft(CONV_1, storage, USER_B)).toBe("");
    expect(readComposerDraft(CONV_1, storage, USER_A)).toBe("ainda aqui");
  });

  it("4) logout clears drafts for the user", () => {
    const { map, storage } = memoryStorage();
    writeComposerDraft(null, "a", storage, USER_A);
    writeComposerDraft(null, "b", storage, USER_B);
    clearAllComposerDrafts(storage, USER_A);
    expect(readComposerDraft(null, storage, USER_A)).toBe("");
    expect(readComposerDraft(null, storage, USER_B)).toBe("b");
    clearAllComposerDrafts(storage);
    expect(map.size).toBe(0);
  });

  it("5) expired session / user switch does not expose legacy keys", () => {
    const { map, storage } = memoryStorage();
    const legacyKey = composerDraftStorageKey(null);
    expect(legacyKey).toBe("amem:composer-draft:v1:new");
    map.set(legacyKey, "legado sem dono");
    // B already has a scoped draft → evidence of account presence → discard legacy
    writeComposerDraft(CONV_1, "b scoped", storage, USER_B);
    expect(readComposerDraft(null, storage, USER_B)).toBe("");
    expect(map.has(legacyKey)).toBe(false);
  });

  it("6) conversation 1 does not contaminate conversation 2", () => {
    const { storage } = memoryStorage();
    writeComposerDraft(CONV_1, "só conversa 1", storage, USER_A);
    writeComposerDraft(CONV_2, "só conversa 2", storage, USER_A);
    expect(readComposerDraft(CONV_1, storage, USER_A)).toBe("só conversa 1");
    expect(readComposerDraft(CONV_2, storage, USER_A)).toBe("só conversa 2");
    clearComposerDraft(CONV_1, storage, USER_A);
    expect(readComposerDraft(CONV_1, storage, USER_A)).toBe("");
    expect(readComposerDraft(CONV_2, storage, USER_A)).toBe("só conversa 2");
  });

  it("7) journey/url prefill does not pull common chat draft", () => {
    const { storage } = memoryStorage();
    writeComposerDraft(null, "rascunho comum", storage, USER_A);
    expect(
      resolveInitialComposerInput({
        urlDraft: "prefill de jornada",
        conversationId: null,
        userId: USER_A,
        storage,
      }),
    ).toBe("prefill de jornada");
    expect(readComposerDraft(null, storage, USER_A)).toBe("rascunho comum");
  });

  it("8) legacy draft migrates only when no foreign user keys exist", () => {
    const { map, storage } = memoryStorage();
    const legacyKey = "amem:composer-draft:v1:new";
    map.set(legacyKey, "legado upgrade");
    expect(readComposerDraft(null, storage, USER_A)).toBe("legado upgrade");
    expect(map.has(legacyKey)).toBe(false);
    expect(map.has(composerDraftStorageKeyForUser(USER_A, null)!)).toBe(true);

    map.clear();
    map.set(legacyKey, "legado perigoso");
    writeComposerDraft(CONV_1, "outro usuario", storage, USER_B);
    expect(readComposerDraft(null, storage, USER_A)).toBe("");
    expect(map.has(legacyKey)).toBe(false);
  });

  it("9) keys never contain email or typed draft text", () => {
    const { map, storage } = memoryStorage();
    const body = "quero refletir sobre paciencia";
    writeComposerDraft(null, body, storage, USER_A);
    writeComposerDraft(CONV_1, body, storage, USER_A);
    for (const key of map.keys()) {
      expect(key).not.toContain("@");
      expect(key).not.toContain(body);
      expect(key).toMatch(/^amem:composer-draft:v2:/);
    }
    expect(normalizeDraftUserScope("a@b.com")).toBeNull();
  });

  it("discards all legacy keys helper", () => {
    const { map, storage } = memoryStorage();
    map.set("amem:composer-draft:v1:new", "x");
    map.set("amem:composer-draft:v1:abc", "y");
    writeComposerDraft(null, "keep", storage, USER_A);
    discardAllLegacyComposerDrafts(storage);
    expect([...map.keys()].every((k) => k.startsWith("amem:composer-draft:v2:"))).toBe(
      true,
    );
  });
});
