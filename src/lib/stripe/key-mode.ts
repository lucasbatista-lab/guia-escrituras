/**
 * Stripe key / event mode helpers (no server-only — unit-testable).
 * Never log secret keys.
 */

export type StripeKeyMode = "live" | "test";

export class StripeModeMismatchError extends Error {
  readonly status = 400;
  readonly code = "mode_mismatch";

  constructor(
    message = "Stripe event mode does not match configured key mode.",
  ) {
    super(message);
    this.name = "StripeModeMismatchError";
  }
}

export class InvalidStripeKeyError extends Error {
  constructor(
    message = "Pagamento indisponível: STRIPE_SECRET_KEY inválida (use sk_live_ ou sk_test_).",
  ) {
    super(message);
    this.name = "InvalidStripeKeyError";
  }
}

/**
 * Resolve Stripe secret key mode.
 * - sk_live_ → live
 * - sk_test_ → test
 * - anything else → InvalidStripeKeyError
 */
export function resolveStripeKeyMode(secretKey: string): StripeKeyMode {
  const key = secretKey.trim();
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  throw new InvalidStripeKeyError();
}

export function expectedLivemode(mode: StripeKeyMode): boolean {
  return mode === "live";
}

/**
 * After signature verification: event.livemode must match configured key mode.
 */
export function assertEventMatchesKeyMode(
  event: { livemode: boolean },
  keyMode: StripeKeyMode,
): void {
  if (event.livemode !== expectedLivemode(keyMode)) {
    throw new StripeModeMismatchError();
  }
}
