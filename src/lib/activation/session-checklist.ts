/**
 * Session-only first-activation checklist — no schema, no spiritual data.
 * Survives refresh in the same tab; cleared on logout via clearActivationChecklist.
 */

const STORAGE_KEY = "amem:activation-checklist:v1";

export type ActivationStepId =
  | "first_chat"
  | "explore_journeys"
  | "know_help";

export type ActivationChecklistState = {
  first_chat: boolean;
  explore_journeys: boolean;
  know_help: boolean;
};

export const EMPTY_ACTIVATION_CHECKLIST: ActivationChecklistState = {
  first_chat: false,
  explore_journeys: false,
  know_help: false,
};

const listeners = new Set<() => void>();

function notifyActivationChecklistListeners(): void {
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore — client re-renders after mark/clear. */
export function subscribeActivationChecklist(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function readStorage(storage: Storage | null | undefined): ActivationChecklistState {
  if (!storage) return { ...EMPTY_ACTIVATION_CHECKLIST };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_ACTIVATION_CHECKLIST };
    const parsed = JSON.parse(raw) as Partial<ActivationChecklistState>;
    return {
      first_chat: Boolean(parsed.first_chat),
      explore_journeys: Boolean(parsed.explore_journeys),
      know_help: Boolean(parsed.know_help),
    };
  } catch {
    return { ...EMPTY_ACTIVATION_CHECKLIST };
  }
}

function writeStorage(
  state: ActivationChecklistState,
  storage: Storage | null | undefined,
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / private mode — fail soft.
  }
}

function resolveStore(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  if (typeof window !== "undefined") return window.sessionStorage;
  return null;
}

export function getActivationChecklist(
  storage?: Storage | null,
): ActivationChecklistState {
  return readStorage(resolveStore(storage));
}

export function markActivationStep(
  step: ActivationStepId,
  storage?: Storage | null,
): ActivationChecklistState {
  const store = resolveStore(storage);
  const next = { ...readStorage(store), [step]: true };
  writeStorage(next, store);
  notifyActivationChecklistListeners();
  return next;
}

/** Logout / account switch — drop session activation progress. */
export function clearActivationChecklist(storage?: Storage | null): void {
  const store = resolveStore(storage);
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  notifyActivationChecklistListeners();
}

export function activationProgressLabel(state: ActivationChecklistState): string {
  const done =
    Number(state.first_chat) +
    Number(state.explore_journeys) +
    Number(state.know_help);
  return `${done} de 3 passos de ativação nesta sessão`;
}

export function planFirstStepHint(planKey: string | null | undefined): {
  title: string;
  body: string;
  href: string;
  cta: string;
} {
  if (
    planKey === "caminho" ||
    planKey === "profundo" ||
    planKey === "particular"
  ) {
    return {
      title: "Primeiro passo",
      body: "Comece por uma conversa livre ou abra uma Jornada quando quiser um ritmo guiado.",
      href: "/conversar",
      cta: "Escrever minha situação",
    };
  }
  return {
    title: "Primeiro passo",
    body: "No Essencial, o caminho principal é conversar. Escreva o que está pesando — sem precisar de uma pergunta perfeita.",
    href: "/conversar",
    cta: "Escrever minha situação",
  };
}

export const ACTIVATION_CHECKLIST_STORAGE_KEY = STORAGE_KEY;
