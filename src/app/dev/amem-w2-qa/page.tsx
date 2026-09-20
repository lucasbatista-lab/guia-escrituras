import { notFound } from "next/navigation";
import Link from "next/link";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { PlatformNav } from "@/components/platform/platform-nav";
import {
  BOTTOM_NAV_FREE,
  BOTTOM_NAV_PAID,
  getPlatformNavItemsForState,
} from "@/lib/journey";
import { allowsMocks, getAppRuntime } from "@/config/runtime";

export const dynamic = "force-dynamic";

/**
 * Local visual QA for W2 FREE/PAID nav — not a production path.
 * Same fail-closed contract as /dev/amem-w0-qa.
 * Visual chrome only — does NOT unlock paid APIs.
 */
export default async function AmemW2QaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (getAppRuntime() !== "development" || !allowsMocks()) notFound();

  const params = await searchParams;
  const raw = params.plan;
  const plan = (Array.isArray(raw) ? raw[0] : raw) === "paid" ? "paid" : "free";
  const items =
    plan === "paid"
      ? getPlatformNavItemsForState("active_ready")
      : getPlatformNavItemsForState("confirmed_without_plan");
  const tabs = plan === "paid" ? BOTTOM_NAV_PAID : BOTTOM_NAV_FREE;

  return (
    <div className="relative min-h-app overflow-hidden">
      <PresenceLight size="sm" />
      <PaperGrain />
      <PlatformNav items={items} plan={plan} />
      <main className="relative z-10 mx-auto max-w-lg px-4 pb-28 pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
          Fixture W2 · {plan.toUpperCase()}
        </p>
        <h1 className="mt-1 font-display text-2xl text-ink">
          Navegação {plan === "paid" ? "assinante" : "conta grátis"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Chrome visual apenas. Não libera APIs pagas. Use ?plan=free ou
          ?plan=paid.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-ink">
          {tabs.map((tab) => (
            <li
              key={tab.id}
              className="rounded-xl border border-border/70 bg-card/70 px-3 py-2"
            >
              {tab.label} ·{" "}
              <code className="text-xs text-ink-soft">{tab.href}</code>
            </li>
          ))}
          <li className="rounded-xl border border-border/70 bg-card/70 px-3 py-2">
            Menu · drawer
          </li>
        </ul>
        <div className="mt-6 flex gap-3 text-sm">
          <Link
            href="/dev/amem-w2-qa?plan=free"
            className="text-wine underline-offset-4 hover:underline"
          >
            FREE
          </Link>
          <Link
            href="/dev/amem-w2-qa?plan=paid"
            className="text-wine underline-offset-4 hover:underline"
          >
            PAID
          </Link>
        </div>
      </main>
    </div>
  );
}
