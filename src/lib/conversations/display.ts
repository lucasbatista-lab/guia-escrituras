/**
 * Pure conversation display helpers — safe for client and server.
 * Keep loadLatestResumePreview in resume.ts (server-only).
 */

export const RESUME_PREVIEW_MAX_CHARS = 120;

/**
 * Strip markup-ish content and truncate for authenticated list/resume UI.
 * Never treat as HTML — React text nodes escape; this only sanitizes length/noise.
 */
export function sanitizeConversationPreview(
  raw: string | null | undefined,
  maxChars = RESUME_PREVIEW_MAX_CHARS,
): string {
  const cleaned = (raw ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars).trim()}…`;
}

export function conversationTitleLabel(title: string | null | undefined): string {
  const cleaned = sanitizeConversationPreview(title, 72);
  return cleaned || "Conversa sem título";
}

/** Friendly relative/absolute activity label in pt-BR. */
export function formatConversationActivity(
  iso: string,
  now = new Date(),
): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "há 1 minuto" : `há ${diffMinutes} minutos`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24 && isSameLocalDay(date, now)) {
    return `hoje às ${formatTimePt(date)}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) {
    return `ontem às ${formatTimePt(date)}`;
  }

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) {
    return diffDays <= 1 ? "há 1 dia" : `há ${diffDays} dias`;
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Deterministic resume tone from last activity age — no emotional/spiritual inference.
 * - recent: under 3 days
 * - few_days: 3–13 days
 * - returning: 14+ days
 */
export type ResumeReturnTone = "recent" | "few_days" | "returning";

export function resumeReturnTone(
  iso: string,
  now = new Date(),
): ResumeReturnTone {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "recent";
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 3) return "recent";
  if (diffDays < 14) return "few_days";
  return "returning";
}

export function resumeReturnCopy(tone: ResumeReturnTone): {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
} {
  if (tone === "returning") {
    return {
      eyebrow: "Retomar",
      title: "Seu histórico continua aqui",
      body: "A última conversa ainda está disponível. Retome o fio ou comece uma reflexão nova — no seu ritmo.",
      cta: "Retomar conversa",
    };
  }
  if (tone === "few_days") {
    return {
      eyebrow: "Continuar",
      title: "Continue de onde parou",
      body: "Sua conversa recente ainda está aqui, com o contexto que já foi construído.",
      cta: "Retomar conversa",
    };
  }
  return {
    eyebrow: "Continuar",
    title: "Continue de onde parou",
    body: "Retome a conversa mantendo o contexto que já foi construído.",
    cta: "Retomar conversa",
  };
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTimePt(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
