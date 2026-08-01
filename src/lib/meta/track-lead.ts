/**
 * Meta Lead is disabled in this version.
 *
 * Soft-success signup paths (duplicate email / enumeration-safe `ok: true`)
 * previously could emit Lead without a new account. Reintroduce only with an
 * authoritative, idempotent server-side signal that cannot be confused with
 * duplicate soft-fail — and never via client heuristics that risk enumeration.
 */

export function trackMetaLeadAfterSignupSuccess(): void {
  // Intentionally no-op. Do not fire browser Lead until an authoritative path exists.
}
