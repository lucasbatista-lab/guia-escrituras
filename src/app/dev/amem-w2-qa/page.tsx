import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { RitualMarker } from "@/components/brand/ritual-marker";
import { PresencePulse } from "@/components/brand/presence-pulse";
import { ScriptureRef } from "@/components/content/scripture-ref";
import { SurfaceScene } from "@/components/surfaces/scene";
import { SurfaceEditorial } from "@/components/surfaces/editorial";
import { SurfaceField } from "@/components/surfaces/field";
import { ListRow } from "@/components/surfaces/list-row";
import { PlatformNav } from "@/components/platform/platform-nav";
import { EmptyState } from "@/components/platform/empty-state";
import { PremiumBadge } from "@/components/commerce/premium-badge";
import { LockPill } from "@/components/commerce/lock-pill";
import { Button } from "@/components/ui/button";
import {
  BOTTOM_NAV_FREE,
  BOTTOM_NAV_PAID,
  getPlatformNavItemsForState,
} from "@/lib/journey";
import { allowsMocks, getAppRuntime } from "@/config/runtime";

export const dynamic = "force-dynamic";

/**
 * Local visual QA for Wave 2 (W2–W5) — not a production path.
 * Same fail-closed contract as /dev/amem-w0-qa.
 * Visual chrome + editorial fixtures only — does NOT unlock paid APIs.
 *
 * Views: nav-free | nav-paid | inicio-free | inicio-paid |
 * hoje-start | hoje-mid | hoje-complete |
 * espaco-empty | espaco-populated | oracoes | diario | salvos
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

  // Back-compat: ?plan=free|paid without view → nav chrome
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
      <main className="relative z-10 mx-auto max-w-lg px-4 pb-28 pt-6">
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
        Fixture W2 · {plan.toUpperCase()}
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
        <Link
          href="/dev/amem-w2-qa?view=nav-free"
          className="text-wine underline-offset-4 hover:underline"
        >
          FREE
        </Link>
        <Link
          href="/dev/amem-w2-qa?view=nav-paid"
          className="text-wine underline-offset-4 hover:underline"
        >
          PAID
        </Link>
      </div>
    </Shell>
  );
}

function InicioFixture({ paid }: { paid: boolean }) {
  return (
    <Shell plan={paid ? "paid" : "free"}>
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        Fixture visual · editorial · sem dados de produção
      </p>
      <header className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
            <RitualMarker />
            Bom dia
          </p>
          <h1 className="mt-1 font-display text-2xl text-ink">
            {paid ? "Continuar em paz, Lucas" : "Bem-vindo ao Amém"}
          </h1>
          <p className="mt-1 text-base text-ink-soft">
            Três a cinco minutos. Sem pressa.
          </p>
        </div>
        {paid ? (
          <PremiumBadge label="Essencial" />
        ) : (
          <span className="text-right text-xs leading-tight text-ink-soft">
            Conta
            <br />
            grátis
          </span>
        )}
      </header>

      <SurfaceScene className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-gold-600,#A8843E)]">
            Hoje com Deus
          </p>
          <RitualMarker pulse />
        </div>
        <p className="mt-1 text-xs text-ink-soft">20 de setembro</p>
        <h2 className="mt-3 font-display text-2xl text-ink">Paz que permanece</h2>
        <p className="mt-2 text-base leading-relaxed text-ink-soft">
          A presença não exige desempenho — só um passo honesto.
        </p>
        <div className="mt-3">
          <ScriptureRef>João 14:27</ScriptureRef>
        </div>
        <Button asChild className="mt-5 min-h-11 w-full bg-ink hover:bg-ink/90">
          <Link href="/hoje">Abrir Hoje</Link>
        </Button>
      </SurfaceScene>

      <SurfaceField className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          Continuação do ritual
        </p>
        <p className="mt-2 text-base text-ink">Como você chega hoje?</p>
      </SurfaceField>

      {paid ? (
        <>
          <SurfaceEditorial className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
              Continuar o caminho
            </p>
            <p className="mt-2 font-display text-lg text-ink">Dia 3 · Confiança</p>
            <p className="mt-1 text-sm text-ink-soft">Um passo de cada vez.</p>
          </SurfaceEditorial>
          <SurfaceField className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Continuar conversa
            </p>
            <p className="mt-2 text-base text-ink">Sobre ansiedade e descanso</p>
          </SurfaceField>
        </>
      ) : (
        <>
          <section className="mt-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Memória viva
            </p>
            <ListRow>
              <div>
                <p className="text-sm font-medium text-ink">Espaço</p>
                <p className="text-sm text-ink-soft">
                  Orações, diário e salvos — quando houver.
                </p>
              </div>
            </ListRow>
          </section>
          <SurfaceEditorial className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
              Caminhos
            </p>
            <p className="mt-2 font-display text-lg text-ink">
              Trilhas guiadas, no seu ritmo
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Editorial — não um dashboard.
            </p>
            <div className="mt-3">
              <LockPill label="Caminho" />
            </div>
          </SurfaceEditorial>
          <SurfaceField className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Conversar
            </p>
            <p className="mt-2 text-base text-ink">
              Porta premium contextual — a conta grátis continua intacta.
            </p>
            <div className="mt-3">
              <LockPill label="Essencial" />
            </div>
          </SurfaceField>
        </>
      )}
    </Shell>
  );
}

function HojeFixture({
  phase,
}: {
  phase: "start" | "mid" | "complete";
}) {
  return (
    <Shell plan="free">
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        Fixture Hoje · {phase} · ZERO LLM · conta grátis
      </p>

      {phase === "start" ? (
        <div className="mt-4 space-y-5">
          <header>
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
              <RitualMarker />
              Hoje
            </p>
            <h1 className="mt-1 font-display text-3xl text-ink">Presença</h1>
            <p className="mt-2 text-base text-ink-soft">
              ~4 min · 20 de setembro
            </p>
          </header>
          <SurfaceField>
            <p className="text-sm text-ink-soft">Como você chega? (opcional)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Em paz", "Cansado", "Ansioso", "Grato"].map((label) => (
                <span
                  key={label}
                  className="inline-flex min-h-11 items-center rounded-full border border-border/70 px-3.5 text-sm text-ink"
                >
                  {label}
                </span>
              ))}
            </div>
          </SurfaceField>
          <Button className="min-h-11 w-full bg-ink hover:bg-ink/90">
            Começar
          </Button>
        </div>
      ) : null}

      {phase === "mid" ? (
        <div className="mt-4 space-y-5">
          <SurfaceScene>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-gold-600,#A8843E)]">
              Chego
            </p>
            <h2 className="mt-2 font-display text-2xl text-ink">
              Paz que permanece
            </h2>
            <ScriptureRef className="mt-3">João 14:27</ScriptureRef>
          </SurfaceScene>
          <SurfaceEditorial>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
              Escuto
            </p>
            <p className="mt-2 text-base leading-relaxed text-ink">
              A paz que Cristo oferece não depende do barulho ao redor.
            </p>
          </SurfaceEditorial>
          <SurfaceEditorial>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
              Olho
            </p>
            <p className="mt-2 text-base leading-relaxed text-ink">
              Onde a ansiedade pediu controle hoje?
            </p>
          </SurfaceEditorial>
          <SurfaceField>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Falo
            </p>
            <p className="mt-2 text-base leading-relaxed text-ink">
              Senhor, recebe o que eu não consigo carregar sozinho.
            </p>
          </SurfaceField>
          <SurfaceField>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Pratico
            </p>
            <p className="mt-2 text-base text-ink">
              Uma respiração lenta antes da próxima mensagem.
            </p>
          </SurfaceField>
          <SurfaceEditorial>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
              Levo
            </p>
            <p className="mt-2 text-base text-ink">
              A presença caminha comigo.
            </p>
          </SurfaceEditorial>
        </div>
      ) : null}

      {phase === "complete" ? (
        <div className="mt-6 space-y-5 text-center">
          <div className="flex justify-center">
            <PresencePulse />
          </div>
          <p className="inline-flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
            <RitualMarker pulse />
            Presença
          </p>
          <h1 className="font-display text-3xl text-ink">Amém.</h1>
          <p className="mx-auto max-w-sm text-base leading-relaxed text-ink-soft">
            Você esteve presente. Isso basta por hoje.
          </p>
          <ScriptureRef>João 14:27</ScriptureRef>
          <div className="flex flex-col gap-3 pt-2">
            <Button variant="outline" className="min-h-11">
              Compartilhar
            </Button>
            <Button asChild className="min-h-11 bg-ink hover:bg-ink/90">
              <Link href="/inicio">Voltar ao Início</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

function EspacoFixture({ populated }: { populated: boolean }) {
  return (
    <Shell plan="free">
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        Fixture Espaço · {populated ? "populado" : "vazio"}
      </p>
      <header className="mt-2">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
          <RitualMarker />
          Seu espaço
        </p>
        <h1 className="mt-1 font-display text-2xl text-ink">Memória viva</h1>
        <p className="mt-2 text-base leading-relaxed text-ink-soft">
          Orações, diário e salvos — um lugar íntimo, não uma lista fria.
        </p>
      </header>

      {!populated ? (
        <div className="mt-6">
          <EmptyState
            title="Ainda em branco"
            description="Quando você orar, escrever ou salvar algo de Hoje, a memória começa aqui."
            actionHref="/hoje"
            actionLabel="Abrir Hoje"
          />
        </div>
      ) : (
        <SurfaceScene className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--amem-gold-600,#A8843E)]">
            Recente · Oração
          </p>
          <p className="mt-3 font-display text-lg leading-snug text-ink">
            “Senhor, ensina-me a descansar sem culpa.”
          </p>
          <p className="mt-2 text-sm text-ink-soft">20 de set., 09:12</p>
        </SurfaceScene>
      )}

      <nav aria-label="Áreas da memória" className="mt-4">
        <ul>
          {[
            {
              title: "Orações",
              meta: populated ? "3 · última 20 de set." : "Ainda em silêncio",
            },
            {
              title: "Diário",
              meta: populated ? "Entrada íntima · 19 de set." : "Página em branco",
            },
            {
              title: "Salvos",
              meta: populated ? "Coleção editorial · 2" : "Coleção vazia",
            },
          ].map((row) => (
            <li key={row.title}>
              <ListRow className="py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-ink">{row.title}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">{row.meta}</p>
                </div>
                <span aria-hidden className="text-ink-soft">
                  →
                </span>
              </ListRow>
            </li>
          ))}
        </ul>
      </nav>
    </Shell>
  );
}

function OracoesFixture() {
  return (
    <Shell plan="free">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
        Seu espaço
      </p>
      <h1 className="mt-1 font-display text-2xl text-ink">Orações</h1>
      <p className="mt-1 text-base text-ink-soft">
        Íntimo por padrão. Nada disso vai para analytics ou IA.
      </p>
      <SurfaceField className="mt-5">
        <p className="text-sm font-medium text-ink">Nova oração</p>
        <p className="mt-1 text-sm text-ink-soft">Escreva com calma.</p>
      </SurfaceField>
      <ul className="mt-4">
        <li>
          <ListRow className="py-4">
            <div>
              <p className="text-base text-ink">
                Senhor, ensina-me a descansar sem culpa.
              </p>
              <p className="mt-1 text-sm text-ink-soft">Em oração</p>
            </div>
          </ListRow>
        </li>
        <li>
          <ListRow className="py-4">
            <div>
              <p className="text-base text-ink">Gratidão pela manhã quieta.</p>
              <p className="mt-1 text-sm text-ink-soft">Marcada como respondida</p>
            </div>
          </ListRow>
        </li>
      </ul>
    </Shell>
  );
}

function DiarioFixture() {
  return (
    <Shell plan="free">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
        Seu espaço
      </p>
      <h1 className="mt-1 font-display text-2xl text-ink">Diário</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Página íntima — não é formulário de administração. O conteúdo do diário
        não entra em analytics nem IA.
      </p>
      <SurfaceField className="mt-5">
        <p className="text-sm text-ink-soft">Texto privado</p>
        <p className="mt-3 min-h-[120px] text-base leading-relaxed text-ink">
          Isto permanece só na sua conta. Não enviamos para IA, analytics nem
          modelos.
        </p>
      </SurfaceField>
    </Shell>
  );
}

function SalvosFixture() {
  return (
    <Shell plan="free">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
        Seu espaço
      </p>
      <h1 className="mt-1 font-display text-2xl text-ink">Salvos</h1>
      <p className="mt-1 text-base text-ink-soft">
        Coleção editorial — tipo, título e data humana.
      </p>
      <ul className="mt-5">
        <li>
          <ListRow className="py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                Hoje
              </p>
              <p className="mt-1 text-base font-medium text-ink">
                João 14:27 · Paz que permanece
              </p>
              <p className="mt-1 text-sm text-ink-soft">20 de setembro de 2026</p>
            </div>
            <span aria-hidden className="text-ink-soft">
              →
            </span>
          </ListRow>
        </li>
        <li>
          <ListRow className="py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                Oração
              </p>
              <p className="mt-1 text-base font-medium text-ink">
                Respiração antes de responder
              </p>
              <p className="mt-1 text-sm text-ink-soft">19 de setembro de 2026</p>
            </div>
            <span aria-hidden className="text-ink-soft">
              →
            </span>
          </ListRow>
        </li>
      </ul>
    </Shell>
  );
}
