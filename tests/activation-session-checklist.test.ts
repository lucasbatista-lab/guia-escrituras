import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTIVATION_CHECKLIST_STORAGE_KEY,
  activationProgressLabel,
  clearActivationChecklist,
  getActivationChecklist,
  markActivationStep,
  planFirstStepHint,
} from "@/lib/activation/session-checklist";

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
    key() {
      return null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  } as Storage;
}

describe("session activation checklist", () => {
  it("marks steps in sessionStorage without collecting spiritual content", () => {
    const store = memoryStorage();
    expect(getActivationChecklist(store).first_chat).toBe(false);
    markActivationStep("first_chat", store);
    expect(getActivationChecklist(store).first_chat).toBe(true);
    expect(store.getItem(ACTIVATION_CHECKLIST_STORAGE_KEY)).toBeTruthy();
    expect(store.getItem(ACTIVATION_CHECKLIST_STORAGE_KEY)).not.toMatch(
      /deus|oração|pecado/i,
    );
    clearActivationChecklist(store);
    expect(getActivationChecklist(store).first_chat).toBe(false);
  });

  it("adapts first-step hint by plan without shaming Essencial", () => {
    const essencial = planFirstStepHint("essencial");
    expect(essencial.body.toLowerCase()).toContain("essencial");
    expect(essencial.body.toLowerCase()).not.toMatch(/inferior|limitado demais/);
    expect(essencial.href).toBe("/conversar");

    const caminho = planFirstStepHint("caminho");
    expect(caminho.body.toLowerCase()).toMatch(/jornada/);
    expect(activationProgressLabel({
      first_chat: true,
      explore_journeys: false,
      know_help: false,
    })).toContain("1 de 3");
  });

  it("wires checklist on empty inicio and clears on logout", () => {
    const inicio = readFileSync(
      join(process.cwd(), "src/app/(platform)/inicio/page.tsx"),
      "utf8",
    );
    const nav = readFileSync(
      join(process.cwd(), "src/components/platform/platform-nav.tsx"),
      "utf8",
    );
    expect(inicio).toContain("ActivationSessionChecklist");
    expect(nav).toContain("clearActivationChecklist");
  });
});
