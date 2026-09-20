import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { AmemSplash } from "@/components/brand/amem-splash";
import { PresenceShareCard } from "@/components/share/presence-share-card";
import { SharePresenceActions } from "@/components/share/share-presence-actions";
import { SoftPaywallSheet } from "@/components/commerce/soft-paywall-sheet";
import { PlatformNav } from "@/components/platform/platform-nav";
import { Button } from "@/components/ui/button";
import { PlanChip } from "@/components/inicio/plan-chip";
import { InkTrail } from "@/components/daily/ink-trail";
import {
  BOTTOM_NAV_FREE,
  BOTTOM_NAV_PAID,
  getPlatformNavItemsForState,
} from "@/lib/journey";
import { getSoftPaywallCopy } from "@/lib/commerce/soft-paywall";
import { allowsMocks, getAppRuntime } from "@/config/runtime";

export const dynamic = "force-dynamic";

/**
 * Local visual QA for Wave 2 + Wave 3A V17 — not a production path.
 * Fail-closed outside development+mocks. Does NOT unlock paid APIs.
 *
 * Views: nav-free | nav-paid | inicio-free | inicio-paid |
 * hoje-start | hoje-mid | hoje-complete |
 * espaco-empty | espaco-populated | oracoes | diario | salvos |
 * splash | splash-b | share | paywall
 */
export default async function AmemW2QaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (getAppRuntime() !== "development" || !allowsMocks()) notFound();

  const params = await searchParams;
  const rawView = params.view;
  const rawPlan = params.plan;
  const view = Array.isArray(rawView) ? rawView[0] : rawView;
  const planParam = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;

  if (!view || view === "nav" || view === "nav-free" || view === "nav-paid") {
    const plan =
      view === "nav-paid" || planParam === "paid" ? "paid" : "free";
    return <NavChrome plan={plan} />;
  }

  switch (view) {
    case "inicio-free":
      return <InicioFixture paid={false} />;
    case "inicio-paid":
      return <InicioFixture paid />;
    case "hoje-start":
      return <HojeFixture phase="start" />;
    case "hoje-mid":
      return <HojeFixture phase="mid" />;
    case "hoje-complete":
      return <HojeFixture phase="complete" />;
    case "espaco-empty":
      return <EspacoFixture populated={false} />;
    case "espaco-populated":
      return <EspacoFixture populated />;
    case "oracoes":
      return <OracoesFixture />;
    case "diario":
      return <DiarioFixture />;
    case "salvos":
      return <SalvosFixture />;
    case "splash":
      return (
        <div className="relative min-h-app">
          <AmemSplash forceHonesty="A" autoHideMs={60_000} />
        </div>
      );
    case "splash-b":
      return (
        <div className="relative min-h-app">
          <AmemSplash forceHonesty="B" autoHideMs={60_000} />
        </div>
      );
    case "share":
      // Standalone preview — no platform header/nav (exported asset must stay shell-free).
      return (
        <div
          className="flex min-h-app flex-col items-center justify-center gap-4 bg-[color:var(--amem-dusk,#2A1824)] px-4 py-8"
          data-amem-share-standalone
        >
          <PresenceShareCard
            eyebrow="Presença · 20 set"
            quote="Você esteve presente. Isso basta por hoje."
            reference="João 14:27"
            className="max-w-md"
          />
          <SharePresenceActions
            className="w-full max-w-md"
            payload={{
              eyebrow: "Presença · 20 set",
              quote: "Você esteve presente. Isso basta por hoje.",
              reference: "João 14:27",
              brandWord: "Amém",
            }}
            shareText="Você esteve presente. Isso basta por hoje."
          />
        </div>
      );
    case "paywall":
      return (
        <Shell plan="free">
          <SoftPaywallSheet copy={getSoftPaywallCopy("conversar")} defaultOpen />
        </Shell>
      );
    default:
      return <NavChrome plan={planParam === "paid" ? "paid" : "free"} />;
  }
}

function Shell({
  plan,
  children,
}: {
  plan: "free" | "paid";
  children: ReactNode;
}) {
  const items =
    plan === "paid"
      ? getPlatformNavItemsForState("active_ready")
      : getPlatformNavItemsForState("confirmed_without_plan");
  return (
    <div className="relative min-h-app overflow-hidden">
      <PresenceLight size="sm" />
      <PaperGrain />
      <PlatformNav items={items} plan={plan} />
      <main className="relative mx-auto max-w-lg px-4 pb-28 pt-6">
        {children}
      </main>
    </div>
  );
}

function NavChrome({ plan }: { plan: "free" | "paid" }) {
  const tabs = plan === "paid" ? BOTTOM_NAV_PAID : BOTTOM_NAV_FREE;
  return (
    <Shell plan={plan}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
        Fixture V17 · {plan.toUpperCase()}
      </p>
      <h1 className="mt-1 font-display text-2xl text-ink">
        Navegação {plan === "paid" ? "assinante" : "conta grátis"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Chrome visual apenas. Não libera APIs pagas.
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
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href="/dev/amem-w2-qa?view=nav-free" className="text-wine underline-offset-4 hover:underline">
          FREE
        </Link>
        <Link href="/dev/amem-w2-qa?view=nav-paid" className="text-wine underline-offset-4 hover:underline">
          PAID
        </Link>
        <Link href="/dev/amem-w2-qa?view=splash" className="text-wine underline-offset-4 hover:underline">
          Splash
        </Link>
        <Link href="/dev/amem-w2-qa?view=share" className="text-wine underline-offset-4 hover:underline">
          Share
        </Link>
        <Link href="/dev/amem-w2-qa?view=paywall" className="text-wine underline-offset-4 hover:underline">
          Paywall
        </Link>
      </div>
    </Shell>
  );
}

function InicioFixture({ paid }: { paid: boolean }) {
  return (
    <Shell plan={paid ? "paid" : "free"}>
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-[30px] font-bold tracking-[-0.035em] text-ink">Início</h1>
        <PlanChip variant={paid ? "paid" : "free"} label={paid ? "Caminho" : "Grátis"} />
      </header>

      <section className="amem-surface-dusk mt-5 px-5 py-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(212,188,140,0.92)]">
          {paid ? "Continuar · Hoje" : "Hoje · 20 set"}
        </p>
        <h2 className="mt-2.5 text-[24px] font-bold leading-tight tracking-[-0.02em] text-[#FFF9F0]">
          {paid ? "Escuto · passo 2" : "Paz que permanece"}
        </h2>
        <p className="mt-2 text-xs text-[#FFFDFC]/70">
          {paid ? "Retome de onde parou · ~2 min" : "Ritual livre · ~4 min · sem cartão"}
        </p>
      </section>

      <Button variant="ritual" className="mt-3.5 min-h-[52px] w-full text-[15px] font-bold">
        {paid ? "Retomar Hoje" : "Entrar no Hoje"}
      </Button>

      <div className="amem-surface-poco mt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
          Ontem você levou
        </p>
        <p className="mt-2 pl-1 text-sm text-ink-soft">
          “Descansar sem culpa.” · João 14:27
        </p>
      </div>

      <div className="mt-3 flex items-stretch gap-2.5">
        <div className="amem-folha flex-1 -rotate-[0.6deg] px-3.5 pb-[18px] pt-4">
          <span className="block h-[2.5px] w-[22px] rounded-sm bg-[linear-gradient(90deg,var(--amem-wine-deep),var(--amem-brass))]" />
          <p className="mt-2.5 text-sm font-bold text-ink">Espaço</p>
          <p className="mt-1 text-[11px] text-[color:var(--amem-mute)]">
            {paid ? "Linha viva · 5 marcas" : "3 memórias vivas"}
          </p>
        </div>
        <div
          className="mt-2.5 flex-1 rotate-[0.7deg] rounded-[18px] px-3.5 py-3.5"
          style={{
            background: "rgba(235,231,225,0.82)",
            boxShadow: "inset 0 0 0 1px var(--amem-hairline)",
          }}
        >
          <span
            className="block h-0.5 w-3.5 rounded-sm opacity-75"
            style={{
              background:
                "linear-gradient(90deg, var(--amem-plum), rgba(184,150,90,0.45))",
            }}
          />
          <p className="mt-2.5 text-[13px] font-semibold text-ink-soft">
            {paid ? "Jornada" : "Caminhos"}
          </p>
          <p className="mt-1 text-[11px] text-[color:var(--amem-mute)]">
            {paid ? "Perdão · dia 3 de 7" : "Prévia · plano Caminho"}
          </p>
        </div>
      </div>

      {paid ? (
        <div className="amem-folha mt-3 px-[18px] py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
            Conversar · Essencial
          </p>
          <p className="mt-2 font-display text-[17px] italic text-ink">
            como orar quando estou seco?
          </p>
        </div>
      ) : null}
    </Shell>
  );
}

function HojeFixture({ phase }: { phase: "start" | "mid" | "complete" }) {
  return (
    <Shell plan="free">
      <header className="flex items-end justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-[color:var(--amem-wine-deep)]">
          Presença
        </h1>
        <p className="text-sm text-[color:var(--amem-mute)]">
          {phase === "complete" ? "Levo" : phase === "mid" ? "Olho · 3 de 6" : "Chego · 1 de 6"}
        </p>
      </header>

      {phase === "complete" ? (
        <InkTrail total={6} currentIndex={5} complete className="mt-3" />
      ) : (
        <InkTrail
          total={6}
          currentIndex={phase === "mid" ? 2 : 0}
          className="mt-3"
        />
      )}

      {phase === "start" ? (
        <div className="mt-4 space-y-4">
          <p className="text-base text-ink-soft">Como você chega agora?</p>
          <div className="flex flex-wrap gap-2">
            {["Em paz", "Cansado", "Ansioso", "Grato"].map((label) => (
              <span
                key={label}
                className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-3.5 text-sm text-ink"
              >
                {label}
              </span>
            ))}
          </div>
          <Button variant="ritual" className="min-h-[52px] w-full font-bold">
            Continuar
          </Button>
        </div>
      ) : null}

      {phase === "mid" ? (
        <div className="mt-2 space-y-3">
          <div
            className="rounded-[14px] border-l-2 px-3.5 py-2.5 opacity-72"
            style={{
              background: "rgba(255,253,252,0.50)",
              borderColor: "rgba(90,34,50,0.14)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--amem-mute)]">
              Já passou · Escuto
            </p>
            <p className="mt-1 text-[13px] text-ink-soft">
              A paz que Cristo oferece não depende do barulho ao redor.
            </p>
          </div>
          <div className="amem-surface-scene px-5 py-6">
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--amem-plum)]">
                Agora · Olho
              </p>
              <p className="mt-3 font-display text-[22px] font-semibold text-ink">
                Onde a ansiedade pediu controle hoje?
              </p>
              <p className="mt-3.5 text-xs text-[color:var(--amem-mute)]">
                Não precisa responder com perfeição. Só com honestidade.
              </p>
            </div>
          </div>
          <div
            className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5"
            style={{ boxShadow: "inset 0 0 0 1px var(--amem-hairline-wine)" }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-plum)]">
                Em seguida · Falo
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">Uma frase verdadeira</p>
            </div>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#FFFDFC]"
              style={{ background: "var(--amem-wine-deep)" }}
            >
              →
            </span>
          </div>
          <Button variant="ritual" className="min-h-[52px] w-full font-bold">
            Continuar
          </Button>
        </div>
      ) : null}

      {phase === "complete" ? (
        <div className="mt-4 space-y-4 text-center">
          <div
            className="mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 35%, #FFFDFC, #E8E2D8)",
              boxShadow:
                "0 12px 28px var(--amem-shadow), inset 0 0 0 1px rgba(255,255,255,0.9)",
            }}
          >
            <span className="amem-ink-sig w-10" />
          </div>
          <h2 className="font-display text-[26px] font-semibold text-ink">
            Você esteve presente.
          </h2>
          <p className="text-[15px] text-ink-soft">Leve isto: descansar sem culpa.</p>
          <div className="amem-folha px-[18px] py-5 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
              Para o Espaço
            </p>
            <p className="mt-2 font-display text-base italic text-ink">
              “Ensina-me a descansar sem culpa.”
            </p>
            <p className="mt-2 text-xs text-[color:var(--amem-mute)]">
              Salvo automaticamente · sem cartão
            </p>
          </div>
          <Button variant="ritual" className="min-h-[52px] w-full font-bold">
            Voltar ao Início
          </Button>
        </div>
      ) : null}
    </Shell>
  );
}

function EspacoFixture({ populated }: { populated: boolean }) {
  return (
    <Shell plan="free">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.035em] text-ink">Espaço</h1>
          <p className="mt-1 text-sm text-[color:var(--amem-mute)]">seu arquivo íntimo</p>
        </div>
      </header>

      {!populated ? (
        <div
          className="mt-7 rounded-3xl px-5 py-9 text-center"
          style={{
            background: "rgba(235,231,225,0.45)",
            boxShadow: "inset 0 0 0 1px var(--amem-hairline)",
          }}
          data-espaco-state="empty"
        >
          <span className="amem-ink-sig mx-auto mb-5 block w-10 opacity-85" />
          <p className="mx-auto max-w-[280px] font-display text-[22px] font-semibold text-ink">
            Este lugar vai guardar o que importa para você.
          </p>
          <p className="mt-3.5 text-[13px] text-[color:var(--amem-mute)]">
            Ainda vazio — e isso é o começo, não um erro.
          </p>
          <div className="mx-auto mt-7 flex max-w-sm flex-col gap-2.5">
            <Button variant="ritual" className="min-h-11 w-full font-bold">
              Primeira oração
            </Button>
            <Button variant="ghost" className="min-h-11 w-full">
              Começar pelo Hoje
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative mt-4 h-[196px]" data-espaco-state="populated">
            <div
              className="absolute left-2.5 right-2.5 top-7 min-h-[128px] -rotate-[2.4deg] rounded-[20px] px-[18px] py-4 opacity-90"
              style={{ background: "#E8E3DB" }}
            >
              <p className="text-[11px] font-semibold text-[color:var(--amem-mute)]">17 SET</p>
              <p className="mt-2 text-sm text-ink-soft">Senhor, estou aqui…</p>
            </div>
            <div
              className="absolute left-1.5 right-1.5 top-3.5 z-[1] min-h-[132px] rotate-[1.6deg] rounded-[20px] px-[18px] py-4"
              style={{ background: "#F3EFE8" }}
            >
              <p className="text-[11px] font-semibold text-[color:var(--amem-mute)]">
                18 SET · SALVO
              </p>
              <p className="mt-2 text-sm text-ink-soft">Paz que permanece</p>
            </div>
            <div className="amem-folha absolute inset-x-0 top-0 z-[2] min-h-[128px] -rotate-[0.5deg] px-[18px] py-4">
              <p className="text-[11px] font-semibold text-[color:var(--amem-mute)]">
                HOJE · 09:12 · ORAÇÃO
              </p>
              <p className="mt-2.5 font-display text-[17px] italic text-ink">
                “Ensina-me a descansar sem culpa.”
              </p>
              <p className="mt-2.5 text-xs text-[color:var(--amem-mute)]">
                Ainda aberta · tocar para retomar
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
            Linha viva
          </p>
          <ul className="relative mt-3 space-y-0 pl-7">
            {[
              ["19 set · diário", "Amanheci mais leve depois da oração."],
              ["18 set · salvo", "Paz que permanece — João 14:27"],
              ["17 set · oração", "“Senhor, estou aqui mesmo sem fôlego.”"],
            ].map(([meta, q], idx) => (
              <li key={meta} className="relative pb-[18px]">
                <span
                  className="absolute left-[-24px] top-1.5 h-[7px] w-[7px] rounded-full"
                  style={
                    idx === 0
                      ? {
                          background: "var(--amem-brass)",
                          boxShadow: "0 0 0 1.5px var(--amem-wine)",
                        }
                      : {
                          background: "var(--amem-canvas)",
                          boxShadow: "0 0 0 1.5px var(--amem-wine)",
                        }
                  }
                />
                <p className="text-[11px] font-semibold text-[color:var(--amem-mute)]">{meta}</p>
                <p className="mt-1 font-display text-[15px] italic text-ink">{q}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Shell>
  );
}

function OracoesFixture() {
  return (
    <Shell plan="free">
      <h1 className="font-display text-2xl text-ink">Orações</h1>
      <p className="mt-1 text-base text-ink-soft">Íntimo por padrão.</p>
      <Button variant="ritual" className="mt-5 min-h-11">
        Nova oração
      </Button>
    </Shell>
  );
}

function DiarioFixture() {
  return (
    <Shell plan="free">
      <h1 className="font-display text-2xl text-ink">Diário</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Página íntima — o conteúdo do diário não entra em analytics nem IA.
      </p>
    </Shell>
  );
}

function SalvosFixture() {
  return (
    <Shell plan="free">
      <h1 className="font-display text-2xl text-ink">Salvos</h1>
      <p className="mt-1 text-base text-ink-soft">Coleção editorial.</p>
      <p className="mt-4 text-sm">
        <Link href="/hoje" className="text-wine underline">
          Abrir Hoje
        </Link>
      </p>
    </Shell>
  );
}
