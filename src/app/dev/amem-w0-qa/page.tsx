import { notFound } from "next/navigation";
import { SoftPaywallSheet } from "@/components/commerce/soft-paywall-sheet";
import { PremiumBadge } from "@/components/commerce/premium-badge";
import { LockPill } from "@/components/commerce/lock-pill";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { RitualMarker } from "@/components/brand/ritual-marker";
import { PresencePulse } from "@/components/brand/presence-pulse";
import { ScriptureRef } from "@/components/content/scripture-ref";
import { SurfaceScene } from "@/components/surfaces/scene";
import { SurfaceEditorial } from "@/components/surfaces/editorial";
import { SurfaceField } from "@/components/surfaces/field";
import { ListRow } from "@/components/surfaces/list-row";
import { PlanStatusBadge } from "@/components/platform/plan-status-badge";
import {
  FREE_ACCOUNT_BENEFITS,
  FREE_ACCOUNT_STATUS_LABEL,
  getSoftPaywallCopy,
} from "@/lib/commerce/soft-paywall";
import { allowsMocks } from "@/config/runtime";

export const dynamic = "force-dynamic";

/**
 * Local visual QA fixture for W0/W1 — not a production path.
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
      <main className="relative mx-auto min-h-app max-w-lg overflow-hidden px-4 py-8">
        <PresenceLight size="sm" />
        <PaperGrain />
        <div className="relative z-10">
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
        </div>
      </main>
    );
  }

  if (view === "primitives") {
    return (
      <main className="relative mx-auto min-h-app max-w-lg space-y-5 overflow-hidden px-4 py-8">
        <PresenceLight centered />
        <PaperGrain />
        <div className="relative z-10 space-y-5">
          <h1 className="font-display text-2xl text-ink">Primitives W1</h1>
          <div className="flex flex-wrap items-center gap-3">
            <PremiumBadge label="Caminho" />
            <PremiumBadge label="Essencial" />
            <LockPill label="Caminho" />
            <RitualMarker />
            <RitualMarker tone="wine" />
            <PresencePulse />
          </div>
          <SurfaceScene>
            <p className="font-display text-lg text-ink">Surface SCENE</p>
            <ScriptureRef>João 14:27</ScriptureRef>
          </SurfaceScene>
          <SurfaceEditorial>
            <p className="text-base leading-relaxed text-ink">
              Surface EDITORIAL com filete — leitura confortável em 16px.
            </p>
          </SurfaceEditorial>
          <SurfaceField>
            <p className="text-sm text-ink-soft">Surface FIELD para ação.</p>
          </SurfaceField>
          <div>
            <ListRow>
              <span className="text-sm text-ink">Orações</span>
            </ListRow>
            <ListRow>
              <span className="text-sm text-ink">Diário</span>
            </ListRow>
          </div>
        </div>
      </main>
    );
  }

  const resource = view === "jornadas" ? "jornadas" : "conversar";
  const copy = getSoftPaywallCopy(resource);

  return (
    <main className="relative mx-auto min-h-app max-w-lg overflow-hidden px-4 py-6">
      <PresenceLight size="sm" />
      <PaperGrain />
      <div className="relative z-10">
        <SoftPaywallSheet copy={copy} defaultOpen />
      </div>
    </main>
  );
}
