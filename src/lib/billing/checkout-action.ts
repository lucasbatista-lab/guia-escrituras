"use server";

import { redirect } from "next/navigation";
import { createSubscriptionCheckout } from "@/lib/stripe/checkout";

export async function startCheckoutAction(intentToken: string | null = null) {
  const result = await createSubscriptionCheckout(intentToken);
  if (!result.ok) {
    const params = new URLSearchParams({ checkout_error: result.code });
    if (intentToken) params.set("intent", intentToken);
    redirect(`/assinar/continuar?${params.toString()}`);
  }
  redirect(result.url);
}
