import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth/session";
import {
  formatPriceBRL,
  getPlanByKey,
} from "@/lib/entitlements";
import { startCheckoutAction } from "@/lib/billing/checkout-action";
import { getContinuationViewState } from "@/lib/signup-intents";

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
  const intentToken = Array.isArray(intentRaw) ? intentRaw[0] : intentRaw;

  if (expiredFlag || !intentToken) {
    return <ContinuationShell kind="expired" />;
  }

  const state = await getContinuationViewState(intentToken, auth.userId);

  if (state.kind === "ready") {
    const plan = getPlanByKey(state.planKey);
    if (!plan) {
      return <ContinuationShell kind="not_found" />;
    }

    return (
      <ContinuationShell kind="ready">
        <div className="space-y-4">
          <div className="rounded-lg border border-border/80 bg-card/70 p-5">
            <p className="text-sm text-ink-soft">Plano selecionado</p>
            <h2 className="font-display text-2xl text-ink">{plan.name}</h2>
            <p className="mt-2 text-sm text-ink-soft">{plan.tagline}</p>
            <p className="mt-4 font-display text-3xl text-ink">
              {formatPriceBRL(plan.priceMonthlyCents)}
              <span className="ml-1 text-sm font-sans font-normal text-ink-soft">
                /mês
              </span>
            </p>
          </div>
          <p className="text-sm text-ink-soft">
            O valor mensal é confirmado no checkout seguro antes do pagamento.
          </p>
          <form action={startCheckoutAction.bind(null, intentToken)}>
            <Button type="submit" className="w-full bg-ink hover:bg-ink/90">
              Continuar para pagamento
            </Button>
          </form>
          <p className="text-center text-sm text-ink-soft">
            <Link href="/planos" className="text-ink underline-offset-4 hover:underline">
              Voltar aos planos
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
  const copy: Record<typeof kind, { title: string; body: string }> = {
    ready: { title: "Continuar assinatura", body: "" },
    expired: {
      title: "Link expirado",
      body: "Este link de continuação expirou. Escolha um plano novamente.",
    },
    used: {
      title: "Assinatura em andamento",
      body: "Este fluxo já foi utilizado. Acesse sua conta para ver o status.",
    },
    not_found: {
      title: "Continuação indisponível",
      body: "Não encontramos um plano pendente para continuar.",
    },
    forbidden: {
      title: "Acesso negado",
      body: "Esta continuação pertence a outra conta.",
    },
  };

  const { title, body } = copy[kind];

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="font-display text-3xl text-ink">{title}</h1>
      {body ? <p className="mt-3 text-sm text-ink-soft">{body}</p> : null}
      {children ?? (
        <Button asChild className="mt-6 w-full" variant="outline">
          <Link href="/planos">Ver planos</Link>
        </Button>
      )}
    </main>
  );
}
