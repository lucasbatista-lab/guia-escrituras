"use server";

import { redirect } from "next/navigation";
import { createSubscriptionCheckout } from "@/lib/stripe/checkout";

export async function startCheckoutAction(intentToken: string) {
  const result = await createSubscriptionCheckout(intentToken);
  if (!result.ok) {
    redirect(
      `/assinar/continuar?intent=${encodeURIComponent(intentToken)}&checkout_error=${result.code}`,
    );
  }
  redirect(result.url);
}
