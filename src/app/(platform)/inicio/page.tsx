import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUserContext } from "@/lib/auth";
import { getPlanByKey } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";

export default async function InicioPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/inicio");
  }

  const plan = auth.planKey ? getPlanByKey(auth.planKey) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Início</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Bem-vindo{auth.email ? `, ${auth.email}` : ""}. Traga sua situação e
          receba uma reflexão baseada nas Escrituras.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
          <h2 className="font-display text-xl text-ink">Continuar conversa</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Mentor principal: interpretação baseada nos Evangelhos.
          </p>
          <Button asChild className="mt-5 bg-ink hover:bg-ink/90">
            <Link href="/conversar">Conversar</Link>
          </Button>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
          <h2 className="font-display text-xl text-ink">Seu plano</h2>
          <p className="mt-2 text-sm text-ink-soft">
            {plan?.name ?? "Nenhuma assinatura ativa"}
            {auth.demoMode ? " · modo demonstração" : ""}
          </p>
          {!plan && (
            <p className="mt-2 text-xs text-ink-soft">
              Não há plano gratuito. Escolha um plano para conversar.
            </p>
          )}
          <Button asChild variant="outline" className="mt-5">
            <Link href={plan ? "/conta" : "/planos"}>
              {plan ? "Ver conta e uso" : "Ver planos"}
            </Link>
          </Button>
        </div>
      </div>

      {!auth.spiritualProfile.onboardingCompleted && (
        <div className="rounded-2xl border border-wine/30 bg-wine/5 p-5 text-sm text-ink">
          Conclua o onboarding para personalizar a política teológica.{" "}
          <Link href="/onboarding" className="underline underline-offset-4">
            Ir para onboarding
          </Link>
        </div>
      )}
    </div>
  );
}
