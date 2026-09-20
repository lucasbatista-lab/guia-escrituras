import { notFound } from "next/navigation";
import { SoftPaywallSheet } from "@/components/commerce/soft-paywall-sheet";
import { PremiumBadge } from "@/components/commerce/premium-badge";
import { LockPill } from "@/components/commerce/lock-pill";
import { PlanStatusBadge } from "@/components/platform/plan-status-badge";
import {
  FREE_ACCOUNT_BENEFITS,
  FREE_ACCOUNT_STATUS_LABEL,
  getSoftPaywallCopy,
} from "@/lib/commerce/soft-paywall";
import { allowsMocks } from "@/config/runtime";

export const dynamic = "force-dynamic";

/**
 * Local visual QA fixture for W0 soft paywall — not a production path.
 * Gated by allowsMocks() so production never serves it.
 */
export default async function AmemW0QaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!allowsMocks()) notFound();

  const params = await searchParams;
  const raw = params.view;
  const view = Array.isArray(raw) ? raw[0] : raw;

  if (view === "conta-free") {
    return (
      <main className="mx-auto min-h-app max-w-lg px-4 py-8">
        <h1 className="font-display text-2xl text-ink">Conta</h1>
        <div className="mt-6 space-y-4 rounded-2xl border border-border/70 bg-card/70 p-5">
          <PlanStatusBadge label={FREE_ACCOUNT_STATUS_LABEL} tone="active" />
          <p className="text-sm text-ink-soft">
            Sua conta grátis está ativa. Você já pode usar o ritual diário e o
            Espaço.
          </p>
          <ul className="grid gap-2 text-sm text-ink sm:grid-cols-2">
            {FREE_ACCOUNT_BENEFITS.map((benefit) => (
              <li key={benefit} className="rounded-xl bg-sand-50/70 px-3 py-2">
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  if (view === "primitives") {
    return (
      <main className="mx-auto min-h-app max-w-lg space-y-4 px-4 py-8">
        <h1 className="font-display text-2xl text-ink">Primitives W0</h1>
        <div className="flex flex-wrap gap-3">
          <PremiumBadge label="Caminho" />
          <PremiumBadge label="Essencial" />
          <LockPill label="Caminho" />
          <LockPill />
        </div>
      </main>
    );
  }

  const resource = view === "jornadas" ? "jornadas" : "conversar";
  const copy = getSoftPaywallCopy(resource);

  return (
    <main className="mx-auto min-h-app max-w-lg px-4 py-6">
      <SoftPaywallSheet copy={copy} defaultOpen />
    </main>
  );
}
