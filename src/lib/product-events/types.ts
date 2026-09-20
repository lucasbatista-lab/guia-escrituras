export const PRODUCT_EVENT_NAMES = [
  "free_account_created",
  "daily_opened",
  "daily_content_viewed",
  "daily_completed",
  "daily_saved",
  "daily_shared",
  "checkin_completed",
  "premium_prompt_viewed",
  "premium_prompt_clicked",
  "chat_started",
  "first_chat_completed",
  "prayer_created",
  "prayer_marked_answered",
  "favorite_created",
  "journal_created",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export const PRODUCT_EVENT_PATHS = [
  "/inicio",
  "/hoje",
  "/cadastro",
  "/email-confirmado",
  "/conversar",
  "/planos",
  "/espaco",
  "/espaco/oracoes",
  "/espaco/salvos",
  "/espaco/diario",
] as const;

export type ProductEventPath = (typeof PRODUCT_EVENT_PATHS)[number];

export function isProductEventName(
  value: string,
): value is ProductEventName {
  return (PRODUCT_EVENT_NAMES as readonly string[]).includes(value);
}

export function sanitizeProductEventPath(path: string): ProductEventPath | null {
  const trimmed = path.trim();
  if ((PRODUCT_EVENT_PATHS as readonly string[]).includes(trimmed)) {
    return trimmed as ProductEventPath;
  }
  if (trimmed.startsWith("/hoje/")) return "/hoje";
  return null;
}

/** Events that must never include private spiritual content in payloads. */
export const PRODUCT_EVENT_FORBIDDEN_PAYLOAD_KEYS = [
  "checkin",
  "message",
  "content",
  "prayer",
  "journal",
  "text",
  "emotion",
  "diary",
] as const;
