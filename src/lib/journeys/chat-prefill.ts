import { getJourneyBySlug, getJourneyStep } from "./registry";
import { sanitizeThemeDraft } from "@/lib/journey/theme-shortcuts";

/**
 * Build chat composer prefill from allow-listed registry only.
 * Returns undefined when slug/step is invalid — never pass arbitrary URL text through.
 */
export function buildJourneyStepChatPrefill(
  journeySlug: string | undefined | null,
  stepSlug: string | undefined | null,
): string | undefined {
  if (!journeySlug?.trim() || !stepSlug?.trim()) return undefined;
  const journey = getJourneyBySlug(journeySlug.trim());
  if (!journey) return undefined;
  const step = getJourneyStep(journey.slug, stepSlug.trim());
  if (!step) return undefined;

  const ref = step.bibleReference.trim();
  const text = `Quero refletir sobre a etapa "${step.title}" da jornada ${journey.title}, relacionada a ${ref}.`;
  return sanitizeThemeDraft(text);
}
