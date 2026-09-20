import { sanitizeThemeDraft } from "@/lib/journey/theme-shortcuts";
import { getDailyContentForDate } from "./content";
import { isIsoCalendarDate } from "./timezone";

/**
 * Trusted editorial prefill for premium chat.
 * Built only from the daily registry — never from user check-in or free text.
 */
export function buildDailyChatPrefill(
  isoDate: string | undefined | null,
): string | undefined {
  if (!isoDate || !isIsoCalendarDate(isoDate)) return undefined;
  const content = getDailyContentForDate(isoDate);
  const text = `Quero conversar sobre o conteúdo de hoje (${content.scriptureReference}): ${content.title}.`;
  return sanitizeThemeDraft(text);
}
