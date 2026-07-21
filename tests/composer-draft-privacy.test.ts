import { describe, expect, it } from "vitest";
import {
  clearAllComposerDrafts,
  composerDraftStorageKey,
  writeComposerDraft,
} from "@/lib/conversations/composer-draft";

describe("composer draft privacy cleanup", () => {
  it("clears all draft keys on logout helper", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
      removeItem: (k: string) => {
        map.delete(k);
      },
      key: (i: number) => Array.from(map.keys())[i] ?? null,
      get length() {
        return map.size;
      },
    };
    writeComposerDraft(null, "rascunho novo", storage);
    writeComposerDraft(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "rascunho conversa",
      storage,
    );
    expect(map.size).toBe(2);
    clearAllComposerDrafts(storage);
    expect(map.has(composerDraftStorageKey(null))).toBe(false);
    expect(map.size).toBe(0);
  });
});
