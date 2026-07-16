/**
 * Launch theme shortcuts for /inicio → /conversar.
 * Local constants only — selecting a theme must not call OpenAI or create a conversation.
 */

export const THEME_SHORTCUTS = [
  {
    label: "Ansiedade e decisões",
    prompt:
      "Estou ansioso com uma decisão e não consigo organizar meus pensamentos.",
  },
  {
    label: "Dinheiro e trabalho",
    prompt:
      "Minha situação financeira está me preocupando e preciso de clareza para agir.",
  },
  {
    label: "Perdão e família",
    prompt:
      "Quero perdoar alguém da minha família sem fingir que não fui ferido.",
  },
  {
    label: "Relacionamentos",
    prompt:
      "Estou passando por uma dificuldade em um relacionamento e preciso de clareza.",
  },
  {
    label: "Culpa e recomeço",
    prompt:
      "Estou com vergonha de ter repetido um erro e não sei como recomeçar.",
  },
  {
    label: "Cansaço e propósito",
    prompt:
      "Estou cansado e sinto que perdi o sentido do que estou fazendo.",
  },
  {
    label: "Silêncio espiritual",
    prompt:
      "Sinto que Deus está em silêncio e tenho dificuldade para perceber sentido no que estou vivendo.",
  },
  {
    label: "Fé e próximos passos",
    prompt:
      "Quero alinhar minha fé com os próximos passos da minha vida, sem pressa.",
  },
] as const;

export const THEME_DRAFT_MAX_LENGTH = 400;

/** Strip markup and bound length before seeding the composer. */
export function sanitizeThemeDraft(raw: string | undefined | null): string | undefined {
  if (typeof raw !== "string") return undefined;
  const cleaned = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, THEME_DRAFT_MAX_LENGTH);
  return cleaned.length > 0 ? cleaned : undefined;
}
