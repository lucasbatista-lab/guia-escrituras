import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutSuccessClient } from "@/components/billing/checkout-success-client";
import { PurchaseJourneySteps } from "@/components/marketing/purchase-journey-steps";
import { ShareInvite } from "@/components/share/share-invite";
import { getAuthUserContext } from "@/lib/auth";
import { resolveCheckoutSuccessState } from "@/lib/billing/checkout-success";
import { isStripeCheckoutSessionId } from "@/lib/billing/stripe-session-id";
import { setCheckoutReturnCookie } from "@/lib/billing/checkout-return-cookie";
import { resolveUserShareUrl } from "@/lib/share/resolve-server";

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

  const initialStatus =
    view.kind === "forbidden"
      ? "forbidden"
      : view.kind === "sync_error"
        ? "sync_error"
        : view.kind === "active"
          ? "active"
          : "processing";

  const initialNextPath = view.kind === "active" ? view.nextPath : null;

  const auth = await getAuthUserContext();
  const shareUrl = auth
    ? await resolveUserShareUrl(auth.userId, "subscription_success")
    : null;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <PurchaseJourneySteps current="pagamento" className="mb-8" />
      <CheckoutSuccessClient
        initialStatus={initialStatus}
        initialNextPath={initialNextPath}
      />
      {shareUrl && initialStatus !== "forbidden" ? (
        <aside className="mt-12 border-t border-border/50 pt-8 opacity-90">
          <h2 className="text-sm font-medium text-ink-soft">
            Talvez alguém próximo também esteja precisando de clareza e
            acolhimento.
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            Se quiser, compartilhe o Amém Chat com uma mensagem pronta.
          </p>
          <ShareInvite shareUrl={shareUrl} className="mt-3" variant="compact" />
        </aside>
      ) : null}
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
