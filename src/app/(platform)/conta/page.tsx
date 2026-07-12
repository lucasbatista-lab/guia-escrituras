import { getAuthUserContext } from "@/lib/auth";
import { getPlanByKey } from "@/lib/entitlements";
import { getBudgetConfig, usageLevelLabel } from "@/lib/usage";

export default async function ContaPage() {
  const auth = await getAuthUserContext();
  const plan = getPlanByKey(auth?.planKey ?? "essencial");
  const budget = getBudgetConfig(auth?.planKey ?? "essencial");

  // Demo: assume normal usage until usage_monthly is wired
  const level = "normal" as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Conta</h1>
        <p className="mt-2 text-ink-soft">
          {auth?.email ?? "Conta em demonstração"}
        </p>
      </div>

      <section className="rounded-2xl border border-border/70 bg-card/60 p-6">
        <h2 className="font-display text-xl text-ink">Plano</h2>
        <p className="mt-2 text-sm text-ink-soft">{plan?.name}</p>
        <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
          {plan?.displayBenefits.map((benefit) => (
            <li key={benefit}>· {benefit}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/60 p-6">
        <h2 className="font-display text-xl text-ink">Uso</h2>
        <p className="mt-2 text-lg text-ink">{usageLevelLabel(level)}</p>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          Mostramos linguagem amigável (uso normal, elevado ou próximo do
          limite), sem cotas rígidas de mensagens. Proteções internas: orçamento
          mensal de planejamento e limite diário de segurança (
          {budget.dailyBurstLimit} requisições/dia no plano atual).
        </p>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/60 p-6">
        <h2 className="font-display text-xl text-ink">Perfil espiritual</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">Tradição</dt>
            <dd className="text-ink">
              {auth?.spiritualProfile.traditionKey ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Estilo</dt>
            <dd className="text-ink">
              {auth?.spiritualProfile.responseStyle ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Profundidade</dt>
            <dd className="text-ink">
              {auth?.spiritualProfile.preferredDepth ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Onboarding</dt>
            <dd className="text-ink">
              {auth?.spiritualProfile.onboardingCompleted
                ? "Concluído"
                : "Pendente"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
