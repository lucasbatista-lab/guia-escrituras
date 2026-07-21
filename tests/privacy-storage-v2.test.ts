import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTIVATION_CHECKLIST_STORAGE_KEY,
  clearActivationChecklist,
  markActivationStep,
} from "@/lib/activation/session-checklist";
import {
  clearAllComposerDrafts,
  composerDraftStorageKey,
  writeComposerDraft,
} from "@/lib/conversations/composer-draft";
import { sanitizeTrackingValue } from "@/lib/acquisition/sanitize";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
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
}

describe("privacy storage V2 — account switch / logout", () => {
  it("clears drafts and activation checklist together", () => {
    const store = memoryStorage();
    writeComposerDraft(null, "texto privado", store);
    markActivationStep("first_chat", store);
    expect(store.getItem(composerDraftStorageKey(null))).toBeTruthy();
    expect(store.getItem(ACTIVATION_CHECKLIST_STORAGE_KEY)).toBeTruthy();

    clearAllComposerDrafts(store);
    clearActivationChecklist(store);

    expect(store.getItem(composerDraftStorageKey(null))).toBeNull();
    expect(store.getItem(ACTIVATION_CHECKLIST_STORAGE_KEY)).toBeNull();
  });

  it("logout wiring clears both privacy surfaces", () => {
    const nav = readFileSync(
      join(process.cwd(), "src/components/platform/platform-nav.tsx"),
      "utf8",
    );
    expect(nav).toContain("clearAllComposerDrafts");
    expect(nav).toContain("clearActivationChecklist");
  });

  it("sanitizes manipulated UTM values without keeping control chars", () => {
    expect(sanitizeTrackingValue("ok\u0000evil", 40)).toBeNull();
    expect(sanitizeTrackingValue("<script>x</script>", 40)).toBe(
      "<script>x</script>".slice(0, 40),
    );
    // Angle brackets are not stripped by UTM sanitizer (DB/admin display only);
    // control characters and length are the hard rejects.
    expect(sanitizeTrackingValue("a".repeat(200), 40)?.length).toBeLessThanOrEqual(
      40,
    );
    expect(sanitizeTrackingValue("utm\nvalue", 20)).toBeNull();
  });
});
