import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutSuccessClient } from "@/components/billing/checkout-success-client";
import { PurchaseJourneySteps } from "@/components/marketing/purchase-journey-steps";
import { resolveCheckoutSuccessState } from "@/lib/billing/checkout-success";
import { isStripeCheckoutSessionId } from "@/lib/billing/stripe-session-id";
import { setCheckoutReturnCookie } from "@/lib/billing/checkout-return-cookie";

export default async function AssinaturaSucessoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sessionIdRaw = params.session_id;
  const sessionIdFromQuery = Array.isArray(sessionIdRaw)
    ? sessionIdRaw[0]
    : sessionIdRaw;

  if (sessionIdFromQuery && isStripeCheckoutSessionId(sessionIdFromQuery)) {
    await setCheckoutReturnCookie(sessionIdFromQuery);
  }

  const view = await resolveCheckoutSuccessState({
    sessionIdFromQuery,
  });

  if (view.kind === "unauthenticated") {
    redirect(view.resumePath);
  }

  if (view.kind === "active") {
    redirect(view.nextPath);
  }

  const initialStatus =
    view.kind === "forbidden"
      ? "forbidden"
      : view.kind === "sync_error"
        ? "sync_error"
        : "processing";

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <PurchaseJourneySteps current="pagamento" className="mb-8" />
      <CheckoutSuccessClient initialStatus={initialStatus} />
      {/* Fallback links if JS is unavailable */}
      <noscript>
        <p className="mt-6 text-sm text-ink-soft">
          <Link href="/assinatura/sucesso" className="underline">
            Atualizar status
          </Link>
          {" · "}
          <Link href="/conta" className="underline">
            Ver minha conta
          </Link>
        </p>
      </noscript>
    </main>
  );
}
