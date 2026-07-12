import Link from "next/link";
import { getAuthUserContext } from "@/lib/auth";
import { getPlanByKey } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";

export default async function InicioPage() {
  const auth = await getAuthUserContext();
  const plan = getPlanByKey(auth?.planKey ?? "essencial");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Início</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Bem-vindo{auth?.email ? `, ${auth.email}` : ""}. Traga sua situação e
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
            {plan?.name ?? "Essencial"}
            {auth?.demoMode ? " · modo demonstração" : ""}
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/conta">Ver conta e uso</Link>
          </Button>
        </div>
      </div>

      {!auth?.spiritualProfile.onboardingCompleted && !auth?.demoMode && (
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
