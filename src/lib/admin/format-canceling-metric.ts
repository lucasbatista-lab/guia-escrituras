/** Honest display when Stripe cancel_at_period_end counts are unavailable. */
export function formatCancelingWithAccessMetric(
  count: number | null | undefined,
): string {
  if (count == null) return "Indisponível no momento";
  return String(count);
}

export function cancelingMetricIsUnavailable(
  count: number | null | undefined,
): boolean {
  return count == null;
}
