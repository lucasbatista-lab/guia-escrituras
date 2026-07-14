/** Stripe Checkout session ids: cs_test_… / cs_live_… */
export function isStripeCheckoutSessionId(value: string): boolean {
  return /^cs_(test|live)_[A-Za-z0-9_]+$/.test(value.trim());
}
