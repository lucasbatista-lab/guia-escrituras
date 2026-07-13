import "server-only";

import Stripe from "stripe";
import { assertStripeConfigured, getStripeSecretKey } from "./config";

let client: Stripe | null = null;
let testClient: Stripe | null = null;

export function setStripeClientForTests(mock: Stripe | null): void {
  testClient = mock;
}

export function getStripeClient(): Stripe {
  if (testClient) return testClient;
  if (client) return client;
  assertStripeConfigured();
  client = new Stripe(getStripeSecretKey(), {
    apiVersion: "2025-08-27.basil",
    typescript: true,
  });
  return client;
}
