import type { CrisisCategory, CrisisDetectionResult } from "./types";

/** Strip diacritics and lowercase for PT-BR matching. */
export function normalizeCrisisText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

interface Signal {
  id: string;
  category: CrisisCategory;
  /** All patterns must match (AND). Empty = single pattern in `any`. */
  all?: RegExp[];
  any: RegExp[];
  /** If any of these match, discard this signal (false-positive guards). */
  unless?: RegExp[];
}

/**
 * Multi-signal detector — phrase families, not a single fragile regex.
 * Tuned for high precision: ordinary anxiety/grief/faith doubt must not match.
 */
const SIGNALS: Signal[] = [
  {
    id: "suicide_explicit",
    category: "suicide",
    any: [
      /\bsuicid/,
      /\btirar a minha vida\b/,
      /\btirar minha vida\b/,
      /\bacabar com a minha vida\b/,
      /\bacabar com minha vida\b/,
      /\bquero morrer\b/,
      /\bvou me matar\b/,
      /\bme matar\b/,
      /\bnao quero mais viver\b/,
      /\bsem vontade de viver\b/,
      /\bnao vejo saida\b.{0,40}\b(viver|vida|morrer)/,
      /\bpensar em morrer\b/,
    ],
    unless: [
      /\bmorrer de (vergonha|medo|rir|saudade|amor)\b/,
      /\bmorto de (fome|cansaco|sono)\b/,
    ],
  },
  {
    id: "self_harm_explicit",
    category: "self_harm",
    any: [
      /\bme machucar\b/,
      /\bme cortar\b/,
      /\bautoagress/,
      /\bautomutil/,
      /\bme ferir\b/,
      /\bquero me ferir\b/,
      /\bvou me cortar\b/,
    ],
  },
  {
    id: "violence_to_others",
    category: "violence",
    any: [
      /\bvou matar\b/,
      /\bquero matar\b/,
      /\bvou agredir\b/,
      /\bvou bater (n|nele|nela|neles|nelas)\b/,
      /\bmatar (ele|ela|eles|elas|fulano)\b/,
    ],
    unless: [/\bmatar a saudade\b/, /\bmatar o tempo\b/, /\bmatar aula\b/],
  },
  {
    id: "abuse_immediate",
    category: "abuse",
    any: [
      /\bviolencia domestica\b/,
      /\bme bate\b/,
      /\besta me agredindo\b/,
      /\bestou sendo agredid/,
      /\babuso (fisico|sexual)\b/,
    ],
    all: undefined,
  },
  {
    id: "medical_emergency",
    category: "medical_emergency",
    any: [
      /\boverdose\b/,
      /\bnao consigo respirar\b/,
      /\bestou engasgad/,
      /\bataque cardiaco\b/,
      /\binfarto\b/,
      /\bavc\b/,
      /\bdesmaiei e nao acordo\b/,
    ],
  },
  {
    id: "panic_acute_now",
    category: "medical_emergency",
    any: [/\bcrise de panico\b/, /\bataque de panico\b/],
    all: [/\b(agora|neste momento|nao passa|nao para)\b/],
  },
];

function signalHits(text: string, signal: Signal): boolean {
  if (signal.unless?.some((re) => re.test(text))) return false;
  if (signal.all && !signal.all.every((re) => re.test(text))) return false;
  return signal.any.some((re) => re.test(text));
}

export function detectCrisisMessage(message: string): CrisisDetectionResult {
  const text = normalizeCrisisText(message);
  if (!text || text.length < 4) return { matched: false };

  const hits: { id: string; category: CrisisCategory }[] = [];
  for (const signal of SIGNALS) {
    if (signalHits(text, signal)) {
      hits.push({ id: signal.id, category: signal.category });
    }
  }

  if (hits.length === 0) return { matched: false };

  // Prefer highest-severity category when multiple fire.
  const priority: CrisisCategory[] = [
    "suicide",
    "self_harm",
    "violence",
    "abuse",
    "medical_emergency",
  ];
  let category = hits[0]!.category;
  for (const p of priority) {
    if (hits.some((h) => h.category === p)) {
      category = p;
      break;
    }
  }

  return {
    matched: true,
    category,
    signalIds: hits.map((h) => h.id),
  };
}
