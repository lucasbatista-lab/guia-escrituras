/** Native share title — no conversation content, no divine claims. */
export const SHARE_TITLE =
  "Amém Chat — reflexões cristãs para situações da vida real";

/**
 * Default share body. Does not promise divine answers, replace a pastor/therapy,
 * or use aggressive sales language. Never includes chat messages.
 */
export const SHARE_TEXT =
  "Encontrei o Amém Chat, um espaço de reflexões cristãs baseadas nas Escrituras para situações da vida real. Talvez faça sentido para você também:";

export const SHARE_COPIED_FEEDBACK = "Link copiado";

export function buildShareMessage(shareUrl: string): string {
  return `${SHARE_TEXT}\n${shareUrl}`;
}

/** Official WhatsApp share endpoint (works on mobile and desktop). */
export function buildWhatsAppShareHref(shareUrl: string): string {
  const text = buildShareMessage(shareUrl);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function isUserShareCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  return name === "AbortError";
}
