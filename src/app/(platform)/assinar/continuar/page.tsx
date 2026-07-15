import Link from "next/link";
import { redirect } from "next/navigation";
import { FocusPageTitle } from "@/components/a11y/focus-page-title";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth/session";
import {
  formatPriceBRL,
  getPlanByKey,
} from "@/lib/entitlements";
import { startCheckoutAction } from "@/lib/billing/checkout-action";
import {
  getContinuationViewState,
  getContinuationViewStateForUser,
  readSignupIntentCookie,
} from "@/lib/signup-intents";
import {
  checkoutFailureMessage,
  type CheckoutFailureCode,
} from "@/lib/stripe/checkout-errors";

const CHECKOUT_ERROR_CODES = new Set<CheckoutFailureCode>([
  "unauthenticated",
  "config_missing",
  "invalid_intent",
  "forbidden",
  "expired",
  "used",
  "price_unavailable",
  "stripe_account_unavailable",
  "stripe_temporary",
  "customer_failed",
  "checkout_failed",
]);

function parseCheckoutError(
  raw: string | string[] | undefined,
): CheckoutFailureCode | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !CHECKOUT_ERROR_CODES.has(value as CheckoutFailureCode)) {
    return null;
  }
  return value as CheckoutFailureCode;
}

function parseCheckoutRef(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  if (!/^[a-zA-Z0-9]{6,12}$/.test(value)) return null;
  return value;
}

export default async function AssinarContinuarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    redirect("/entrar?next=/assinar/continuar");
  }

  const params = await searchParams;
  const expiredFlag = params.expired === "1";
  const intentRaw = params.intent;
  const intentFromQuery = Array.isArray(intentRaw) ? intentRaw[0] : intentRaw;
  const intentFromCookie = await readSignupIntentCookie();
  const intentToken = intentFromQuery?.trim() || intentFromCookie;
  const checkoutError = parseCheckoutError(params.checkout_error);
  const checkoutRef = parseCheckoutRef(params.ref);

  if (expiredFlag) {
    return <ContinuationShell kind="expired" />;
  }

  const state = intentToken
    ? await getContinuationViewState(intentToken, auth.userId)
    : await getContinuationViewStateForUser(auth.userId);

  if (state.kind === "ready") {
    const plan = getPlanByKey(state.planKey);
    if (!plan) {
      return <ContinuationShell kind="not_found" />;
    }

    const checkoutToken = state.intentToken;

    return (
      <ContinuationShell kind="ready">
        <div className="mt-8 space-y-5">
          {checkoutError ? (
            <div
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              role="alert"
              aria-live="assertive"
            >
              <p>{checkoutFailureMessage(checkoutError)}</p>
              {checkoutRef ? (
                <p className="mt-1 text-xs text-destructive/80">
                  Referência: {checkoutRef}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
              Seu plano
            </p>
            <h2 className="mt-2 font-display text-2xl text-ink">{plan.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {plan.tagline}
            </p>
            <p className="mt-4 font-display text-3xl text-ink">
              {formatPriceBRL(plan.priceMonthlyCents)}
              <span className="ml-1 text-sm font-sans font-normal text-ink-soft">
                /mês
              </span>
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ink-soft">
              {plan.displayBenefits.map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-wine/70" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 text-sm leading-relaxed text-ink-soft">
            <p>Assinatura mensal com renovação automática.</p>
            <p>
              Você pode cancelar a renovação a qualquer momento na sua conta no
              Amém Chat.
            </p>
            <p>Pagamento seguro processado pela Stripe.</p>
          </div>

          <div
            className="rounded-xl border border-border/60 bg-sand-100/60 px-4 py-3 text-sm text-ink-soft"
            aria-live="polite"
          >
            <p className="font-medium text-ink">Próximos passos</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Confirmar o pagamento</li>
              <li>Personalizar sua experiência</li>
              <li>Começar a conversar</li>
            </ol>
          </div>

          <form action={startCheckoutAction.bind(null, checkoutToken)}>
            <Button
              type="submit"
              size="lg"
              className="min-h-12 w-full bg-ink text-base hover:bg-ink/90"
            >
              {checkoutError
                ? "Tentar pagamento novamente"
                : "Ir para pagamento seguro"}
            </Button>
          </form>
          <p className="text-center text-sm text-ink-soft">
            <Link
              href="/planos"
              className="text-ink underline-offset-4 hover:underline"
            >
              Trocar de plano
            </Link>
          </p>
        </div>
      </ContinuationShell>
    );
  }

  return <ContinuationShell kind={state.kind} />;
}

function ContinuationShell({
  kind,
  children,
}: {
  kind: "ready" | "expired" | "used" | "not_found" | "forbidden";
  children?: React.ReactNode;
}) {
  const copy: Record<
    typeof kind,
    { title: string; body: string; live?: string }
  > = {
    ready: {
      title: "Quase lá — confirme sua assinatura",
      body: "Revise o plano e siga para o pagamento. Faltam poucos passos.",
    },
    expired: {
      title: "Este link expirou",
      body: "Escolha um plano novamente para retomar a assinatura.",
      live: "Link de continuação expirado.",
    },
    used: {
      title: "Assinatura já em andamento",
      body: "Este passo já foi usado. Veja o status na sua conta.",
      live: "Fluxo de assinatura já utilizado.",
    },
    not_found: {
      title: "Nenhum plano pendente",
      body: "Não encontramos uma assinatura para continuar. Escolha um plano para começar.",
      live: "Continuação indisponível.",
    },
    forbidden: {
      title: "Acesso não permitido",
      body: "Esta continuação pertence a outra conta.",
      live: "Continuação de outra conta.",
    },
  };

  const { title, body, live } = copy[kind];

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16">
      <FocusPageTitle className="font-display text-3xl text-ink">
        {title}
      </FocusPageTitle>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
      {live ? (
        <p className="sr-only" role="status" aria-live="polite">
          {live}
        </p>
      ) : null}
      {children ?? (
        <Button asChild className="mt-8 min-h-11 w-full" variant="outline">
          <Link href="/planos">Ver planos</Link>
        </Button>
      )}
    </main>
  );
}
