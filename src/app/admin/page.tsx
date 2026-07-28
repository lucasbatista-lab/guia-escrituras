import Link from "next/link";
import {
  AdminMetricsError,
  formatRevenueBrl,
  getAdminOverviewMetrics,
} from "@/lib/admin/metrics";
import { formatCancelingWithAccessMetric } from "@/lib/admin/format-canceling-metric";
import { buildOperationalAlerts } from "@/lib/admin/operational-alerts";
import { formatPriceBRL } from "@/lib/entitlements";
import { StripeReadinessPanel } from "@/components/admin/stripe-readiness-panel";
import {
  AdminAlertItem,
  AdminEmptyState,
  AdminExternalToolLink,
  AdminKpi,
  AdminOpLink,
  AdminPillarBlock,
  AdminQueueItem,
  AdminSection,
} from "@/components/admin/admin-primitives";

const PARTIAL_HINT =
  "PARCIAL — limite de leitura atingido; não é o total completo.";

export default async function AdminHomePage() {
  let metrics;
  try {
    metrics = await getAdminOverviewMetrics();
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return (
        <AdminEmptyState
          tone="error"
          title="Não foi possível carregar a visão geral"
          description={error.message}
          actionHref="/admin"
          actionLabel="Tentar de novo"
        />
      );
    }
    throw error;
  }

  const alerts = buildOperationalAlerts({
    paymentEventsReceivedStuck: metrics.paymentEventsReceivedStuck,
    paymentEventsFailed: metrics.paymentEventsFailed,
    pastDueSubscriptions: metrics.pastDueSubscriptions,
    checkoutsStuckOver30m: metrics.checkoutsStuckOver30m,
    usersWithDuplicateSubscriptions: metrics.usersWithDuplicateSubscriptions,
    cancelingWithAccessCount: metrics.cancelingWithAccessCount,
    yesterdayReportPresent: metrics.yesterdayReportPresent,
    yesterdayReportDate: metrics.yesterdayReportDate,
    activeSubscriberUsers: metrics.activeSubscriberUsers,
    aiRequestsToday: metrics.aiRequestsToday,
    aiEstimatedCostBrlCentsToday: metrics.aiEstimatedCostBrlCentsToday,
  });
  const cancelingLabel = formatCancelingWithAccessMetric(
    metrics.cancelingWithAccessCount,
  );
  const livePartial = metrics.liveSubscriptionsPartial;
  const aiTodayPartial = metrics.aiMetricsPartialToday;
  const ai30Partial = metrics.aiMetricsPartial30d;

  const criticalAlerts = alerts.filter((a) => a.level === "critical");
  const attentionAlerts = alerts.filter((a) => a.level === "attention");
  const actionableCount = criticalAlerts.length + attentionAlerts.length;

  const primaryAction =
    criticalAlerts[0] ??
    attentionAlerts[0] ??
    null;

  const operationStatus =
    criticalAlerts.length > 0
      ? {
          label: "Atenção crítica",
          detail: `${criticalAlerts.length} alerta(s) crítico(s) exigem investigação.`,
          tone: "critical" as const,
        }
      : attentionAlerts.length > 0
        ? {
            label: "Atenção operacional",
            detail: `${attentionAlerts.length} item(ns) de atenção nas integrações disponíveis.`,
            tone: "attention" as const,
          }
        : {
            label: "Sem alertas críticos detectados",
            detail:
              "Sem alertas críticos detectados pelas integrações disponíveis. Continue as revisões de rotina.",
            tone: "calm" as const,
          };

  const updatedLabel = new Date(metrics.generatedAt).toLocaleString("pt-BR", {
    timeZone: metrics.operationalTimezone,
  });

  return (
    <div className="space-y-8">
      {/* 1. Faixa de comando */}
      <section
        aria-labelledby="admin-command-strip"
        className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-sand-50/80 to-wine/[0.06] shadow-[0_1px_0_rgba(44,36,28,0.05)]"
      >
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
              Comando · America/Sao_Paulo
            </p>
            <h1
              id="admin-command-strip"
              className="mt-1.5 font-display text-3xl tracking-tight text-ink sm:text-[2.15rem]"
            >
              Visão geral
            </h1>
            <p className="mt-2 text-sm capitalize text-ink">
              {metrics.operationalDayLabel}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Atualizado em {updatedLabel}. Sem conteúdo de conversas. Métricas
              de IA são estimativas (não fatura do provedor).
            </p>
          </div>

          <div
            className={
              operationStatus.tone === "critical"
                ? "rounded-xl border border-red-700/40 bg-red-50 px-3 py-3"
                : operationStatus.tone === "attention"
                  ? "rounded-xl border border-amber-700/40 bg-amber-50 px-3 py-3"
                  : "rounded-xl border border-border/70 bg-card/80 px-3 py-3"
            }
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              Estado da operação
            </p>
            <p className="mt-1 font-display text-xl text-ink">
              {operationStatus.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              {operationStatus.detail}
            </p>
            <p className="mt-2 text-xs text-ink">
              Alertas acionáveis:{" "}
              <span className="font-medium">{actionableCount}</span>
              {alerts.length !== actionableCount
                ? ` · ${alerts.length} no total (inclui informativos)`
                : null}
            </p>
            {primaryAction ? (
              <Link
                href={primaryAction.href}
                className="mt-3 inline-flex min-h-11 items-center rounded-md bg-ink px-3 text-sm text-sand-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {primaryAction.cta}
              </Link>
            ) : (
              <Link
                href="#admin-filas-operacionais"
                className="mt-3 inline-flex min-h-11 items-center rounded-md border border-border/80 bg-card px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Revisar filas
              </Link>
            )}
          </div>
        </div>
        {metrics.aiMetricsPartial || livePartial ? (
          <p className="border-t border-amber-700/25 bg-amber-50/70 px-4 py-2 text-xs text-amber-950 sm:px-5">
            Há leituras parciais neste painel — números marcados com{" "}
            <span className="font-medium">PARCIAL</span> não são totais
            completos.
          </p>
        ) : null}
      </section>

      {/* 2. Alertas prioritários */}
      <AdminSection
        title="Alertas prioritários"
        description="Críticos e de atenção aparecem antes dos KPIs secundários. Nível indicado por texto e cor."
        tone="priority"
      >
        {alerts.length === 0 ? (
          <AdminEmptyState
            tone="empty"
            title="Nenhum alerta operacional agora"
            description="Sem alertas críticos detectados pelas integrações disponíveis. Use as filas e os pilares abaixo para revisões de rotina."
            actionHref="/admin/incidentes"
            actionLabel="Abrir incidentes"
          />
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <AdminAlertItem
                key={alert.key}
                level={alert.level}
                title={alert.message}
                context={`${alert.meaning} → ${alert.investigate}`}
                period="Snapshot agora"
                actionLabel={alert.cta}
                href={alert.href}
                source="Integrações do Admin"
              />
            ))}
          </ul>
        )}
      </AdminSection>

      {/* 3. Hoje — faixa compacta */}
      <AdminSection
        title="Hoje"
        description="Dia operacional em Brasília (America/Sao_Paulo). Faixa compacta — não confundir com snapshot ou acumulado."
      >
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <AdminKpi
            compact
            label="Novos usuários"
            value={String(metrics.newUsersToday)}
            href="/admin/usuarios"
            hint="Desde a meia-noite em Brasília."
          />
          <AdminKpi
            compact
            label="Pedidos de IA"
            value={String(metrics.aiRequestsToday)}
            href="/admin/custos"
            partial={aiTodayPartial}
            hint={
              aiTodayPartial
                ? PARTIAL_HINT
                : "Estimativa operacional desde meia-noite em Brasília."
            }
          />
          <AdminKpi
            compact
            label="Alertas abertos"
            value={String(alerts.length)}
            hint={
              alerts.length === 0
                ? "Snapshot agora — nenhum item na faixa de atenção."
                : "Snapshot agora — priorize Alertas prioritários."
            }
          />
          <AdminKpi
            compact
            label="Assinantes ativos"
            value={String(metrics.activeSubscriberUsers)}
            href="/admin/usuarios?status=active"
            partial={livePartial}
            hint={
              livePartial
                ? PARTIAL_HINT
                : "Snapshot do estado atual — não é contagem “de hoje”."
            }
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <AdminOpLink href="/admin/usuarios?canceling=1">
            Cancelando ({cancelingLabel})
          </AdminOpLink>
          <AdminOpLink href="/admin/usuarios?past_due=1">
            Past due ({metrics.pastDueSubscriptions})
          </AdminOpLink>
          <AdminOpLink href="/admin/aquisicao">Aquisição</AdminOpLink>
          <AdminOpLink href="/admin/eventos">Eventos</AdminOpLink>
        </div>
      </AdminSection>

      {/* 4. Filas operacionais — superfície central */}
      <AdminSection
        labelledBy="admin-filas-operacionais"
        description="Customer Success — prioridade visual por risco. Contagens só quando confiáveis."
      >
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="admin-filas-operacionais"
              className="font-display text-xl text-ink"
            >
              Filas operacionais
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Atalhos acionáveis. Contagens só quando já são confiáveis neste
              painel; demais filas abrem a lista filtrada sem inventar números.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AdminQueueItem
            emphasize
            name="Pagamentos em risco"
            count={metrics.pastDueSubscriptions}
            urgency={
              metrics.pastDueSubscriptions > 0 ? "critical" : "low"
            }
            explanation="Assinaturas past_due — cobrança em atraso."
            href="/admin/usuarios?past_due=1"
          />
          <AdminQueueItem
            emphasize
            name="Checkout parado"
            count={
              typeof metrics.checkoutsStuckOver30m === "number"
                ? metrics.checkoutsStuckOver30m
                : metrics.checkoutsPending
            }
            urgency={
              metrics.checkoutsStuckOver30m > 0 ? "high" : "medium"
            }
            explanation="Checkout pendente ou stuck (>30 min)."
            href="/admin/usuarios?checkout_pending=1"
          />
          <AdminQueueItem
            emphasize
            name="Assinou e nunca conversou"
            urgency="high"
            explanation="Ativação falhou após assinatura efetiva."
            href="/admin/usuarios?active_no_conversation=1"
          />
          <AdminQueueItem
            name="Aguardando confirmação"
            urgency="medium"
            explanation="Fluxo de cadastro — e-mail ainda não confirmado."
            href="/admin/usuarios?awaiting_confirmation=1"
          />
          <AdminQueueItem
            name="Inatividade ≥ 7 dias"
            urgency="medium"
            explanation="Assinantes sem atividade recente."
            href="/admin/usuarios?inactive_days=7"
          />
          <AdminQueueItem
            name="Cancelamento agendado"
            count={cancelingLabel}
            urgency={
              metrics.cancelingWithAccessCount &&
              metrics.cancelingWithAccessCount > 0
                ? "medium"
                : "low"
            }
            explanation="Renovação cancelada com acesso ainda vigente."
            href="/admin/usuarios?canceling=1"
          />
          <AdminQueueItem
            name="Sem assinatura"
            count={metrics.usersWithoutSubscription}
            urgency="low"
            explanation="Confirmados sem plano efetivo."
            href="/admin/usuarios?status=none"
          />
          <AdminQueueItem
            name="Duplicidades"
            count={metrics.usersWithDuplicateSubscriptions}
            urgency={
              metrics.usersWithDuplicateSubscriptions > 0 ? "high" : "low"
            }
            explanation="Assinaturas ativas duplicadas."
            href="/admin/usuarios?duplicates=1"
          />
          <AdminQueueItem
            name="Inativo ≥ 3 / 14 / 30 dias"
            urgency="low"
            explanation="Outros limiares de inatividade contínua."
            href="/admin/usuarios?inactive_days=3"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-soft">
          <AdminOpLink href="/admin/usuarios?inactive_days=14">
            Inativo ≥ 14
          </AdminOpLink>
          <AdminOpLink href="/admin/usuarios?inactive_days=30">
            Inativo ≥ 30
          </AdminOpLink>
        </div>
      </AdminSection>

      {/* 5. Visão por pilares */}
      <div>
        <h2 className="font-display text-xl text-ink">Visão por pilares</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Resumos distintos — aprofunde nas páginas dedicadas. Hoje, snapshot,
          rolling e acumulado não se misturam.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <AdminPillarBlock
            eyebrow="Aquisição"
            title="Cadastro → assinatura"
            limitation="Funil só a partir de signup_intents (UTMs/ref). Não inclui visitas à home sem cadastro."
            href="/admin/aquisicao"
            hrefLabel="Abrir aquisição"
          >
            <AdminKpi
              compact
              label="Conversão cadastro → assinatura"
              value={
                metrics.signupToSubscriberRate == null
                  ? "—"
                  : `${(metrics.signupToSubscriberRate * 100).toFixed(1)}%`
              }
              partial={livePartial}
              hint="Assinantes efetivos ÷ usuários totais."
            />
            {metrics.subscribersByUtmSource.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                {metrics.subscribersByUtmSource.slice(0, 3).map((row) => (
                  <li key={row.source} className="flex justify-between gap-2">
                    <span className="truncate">{row.source}</span>
                    <span>
                      {row.count}
                      {livePartial ? " · PARCIAL" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-ink-soft">
                Sem utm_source registrado nos signup_intents dos assinantes
                efetivos.
              </p>
            )}
          </AdminPillarBlock>

          <AdminPillarBlock
            eyebrow="Produto"
            title="Ativação e uso"
            limitation="Sem conteúdo de conversas. Detalhes de jornadas e consumo nas telas dedicadas."
            href="/admin/ativacao"
            hrefLabel="Abrir ativação"
          >
            <div className="flex flex-wrap gap-2">
              <AdminOpLink href="/admin/ativacao">Ativação</AdminOpLink>
              <AdminOpLink href="/admin/uso">Uso</AdminOpLink>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <AdminKpi
                compact
                label="IA hoje"
                value={String(metrics.aiRequestsToday)}
                partial={aiTodayPartial}
                hint={aiTodayPartial ? PARTIAL_HINT : undefined}
              />
              <AdminKpi
                compact
                label="IA 30d"
                value={String(metrics.aiRequests30d)}
                partial={ai30Partial}
                hint={ai30Partial ? PARTIAL_HINT : undefined}
              />
            </div>
          </AdminPillarBlock>

          <AdminPillarBlock
            eyebrow="Receita"
            title="Billing e eventos"
            limitation="Checkouts e payment_events são acumulados / estado atual — não totais “de hoje”. Receita real ainda não integrada."
            href="/admin/eventos"
            hrefLabel="Abrir eventos"
          >
            <div className="grid grid-cols-2 gap-2">
              <AdminKpi
                compact
                label="MRR catálogo"
                value={formatPriceBRL(metrics.mrrCatalogBrlCents)}
                partial={livePartial}
                hint="Estimativa pelo catálogo."
              />
              <AdminKpi
                compact
                label="Receita real"
                value={formatRevenueBrl(metrics.realRevenueBrlCents)}
                unavailable
                hint="Ainda não integrada."
              />
              <AdminKpi
                compact
                label="Events failed"
                value={String(metrics.paymentEventsFailed)}
                href="/admin/eventos?status=failed"
              />
              <AdminKpi
                compact
                label="Received stuck"
                value={String(metrics.paymentEventsReceivedStuck)}
                href="/admin/eventos?status=received_stuck"
              />
            </div>
          </AdminPillarBlock>

          <AdminPillarBlock
            eyebrow="Operação"
            title="Suporte e incidentes"
            limitation="Canal único: e-mail. Sem ticketing neste painel. Health sob demanda."
            href="/admin/incidentes"
            hrefLabel="Abrir incidentes"
          >
            <div className="flex flex-wrap gap-2">
              <AdminOpLink href="/admin/suporte">Suporte (SOP)</AdminOpLink>
              <AdminOpLink href="/admin/incidentes">Incidentes</AdminOpLink>
              <AdminOpLink href="/admin/relatorios">Relatórios</AdminOpLink>
            </div>
          </AdminPillarBlock>
        </div>
      </div>

      {/* Snapshot secundário — estado atual, sem competir com o comando */}
      <details className="group rounded-2xl border border-border/60 bg-sand-50/40 open:bg-card/40">
        <summary className="cursor-pointer list-none px-4 py-3 font-display text-lg text-ink marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex min-h-11 items-center gap-2">
            Estado atual (snapshot)
            <span className="text-xs font-sans font-normal text-ink-soft group-open:hidden">
              — expandir assinaturas e totais
            </span>
          </span>
        </summary>
        <div className="space-y-4 border-t border-border/50 px-4 py-4">
          <p className="text-sm text-ink-soft">
            Snapshot agora — não confundir com métricas do dia. “Novos hoje”
            usa Brasília; totais e janelas 7/30 dias são acumulados / rolling.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <AdminKpi
              compact
              label="Usuários totais"
              value={String(metrics.totalUsers)}
            />
            <AdminKpi
              compact
              label="Novos (7 dias)"
              value={String(metrics.newUsers7d)}
            />
            <AdminKpi
              compact
              label="Novos (30 dias)"
              value={String(metrics.newUsers30d)}
            />
            <AdminKpi
              compact
              label="Sem assinatura"
              value={String(metrics.usersWithoutSubscription)}
              href="/admin/usuarios?status=none"
              partial={livePartial}
              hint={livePartial ? PARTIAL_HINT : undefined}
            />
            <AdminKpi
              compact
              label="Assinaturas ativas"
              value={String(metrics.activeSubscriberUsers)}
              partial={livePartial}
              hint={livePartial ? PARTIAL_HINT : undefined}
            />
            <AdminKpi
              compact
              label="Em teste"
              value={String(metrics.trialingSubscriberUsers)}
              href="/admin/usuarios?status=trialing"
              partial={livePartial}
              hint={livePartial ? PARTIAL_HINT : undefined}
            />
            <AdminKpi
              compact
              label="Encerradas"
              value={String(metrics.canceledSubscriptions)}
              href="/admin/usuarios?status=canceled"
            />
            <AdminKpi
              compact
              label="Checkouts concluídos"
              value={String(metrics.checkoutsCompleted)}
            />
          </div>
          <ul className="space-y-1 text-sm">
            {metrics.subscribersByPlan.map((row) => (
              <li
                key={row.planKey}
                className="flex justify-between rounded-lg border border-border/50 px-3 py-2"
              >
                <span className="capitalize text-ink">{row.planKey}</span>
                <span className="text-ink-soft">
                  {row.count}
                  {livePartial ? " · PARCIAL" : ""}
                </span>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <AdminKpi
              compact
              label="Checkouts iniciados"
              value={String(metrics.checkoutsStarted)}
            />
            <AdminKpi
              compact
              label="Pendentes"
              value={String(metrics.checkoutsPending)}
              href="/admin/usuarios?checkout_pending=1"
            />
            <AdminKpi
              compact
              label="Expirados/cancelados"
              value={String(metrics.checkoutsExpiredOrCanceled)}
            />
            <AdminKpi
              compact
              label="Events processed"
              value={String(metrics.paymentEventsProcessed)}
            />
            <AdminKpi
              compact
              label="Events received"
              value={String(metrics.paymentEventsReceived)}
              href="/admin/eventos?status=received"
            />
            <AdminKpi
              compact
              label="Indicações atribuídas"
              value={String(metrics.referralsAttributed)}
            />
            <AdminKpi
              compact
              label="1ª cobrança"
              value={String(metrics.referralsFirstPayment)}
            />
            <AdminKpi
              compact
              label="Recompensas pendentes"
              value={String(metrics.referralsRewardPending)}
            />
          </div>
          <p className="text-xs text-ink-soft">
            past_due, events failed, received e checkout pendente são estados
            distintos — não misturar sob “falha de pagamento”.
          </p>
        </div>
      </details>

      <details className="group rounded-2xl border border-border/60 bg-sand-50/40">
        <summary className="cursor-pointer list-none px-4 py-3 font-display text-lg text-ink [&::-webkit-details-marker]:hidden">
          <span className="inline-flex min-h-11 items-center">
            IA (estimativa / planning) — 30 dias
          </span>
        </summary>
        <div className="grid gap-2 border-t border-border/50 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminKpi
            compact
            label="Tokens entrada"
            value={metrics.aiInputTokens30d.toLocaleString("pt-BR")}
            partial={ai30Partial}
            hint={ai30Partial ? PARTIAL_HINT : undefined}
          />
          <AdminKpi
            compact
            label="Tokens saída"
            value={metrics.aiOutputTokens30d.toLocaleString("pt-BR")}
            partial={ai30Partial}
            hint={ai30Partial ? PARTIAL_HINT : undefined}
          />
          <AdminKpi
            compact
            label="Custo est. BRL"
            value={formatPriceBRL(metrics.aiEstimatedCostBrlCents30d)}
            partial={ai30Partial}
            estimated
            hint={
              ai30Partial
                ? PARTIAL_HINT
                : "Estimativa interna — não é fatura OpenAI."
            }
          />
          <AdminKpi
            compact
            label="Latência média"
            value={
              metrics.aiAvgLatencyMs30d == null
                ? "—"
                : `${metrics.aiAvgLatencyMs30d} ms`
            }
            partial={ai30Partial}
            hint={ai30Partial ? PARTIAL_HINT : undefined}
          />
          <AdminKpi
            compact
            label="Erros de IA"
            value={String(metrics.aiErrors30d)}
            partial={ai30Partial}
            hint={ai30Partial ? PARTIAL_HINT : undefined}
          />
          <AdminKpi
            compact
            label="Custo USD micros"
            value={String(metrics.aiEstimatedCostUsdMicros30d)}
            partial={ai30Partial}
            hint={ai30Partial ? PARTIAL_HINT : undefined}
          />
          <AdminKpi
            compact
            label="2ª cobrança (indicações)"
            value={String(metrics.referralsSecondPayment)}
          />
        </div>
      </details>

      {/* 6. Ferramentas externas */}
      <AdminSection
        title="Ferramentas externas"
        description="Atalhos auxiliares — visualmente distintos de rotas internas do Admin."
        tone="muted"
      >
        <div className="flex flex-wrap gap-2">
          <AdminExternalToolLink href="https://dashboard.stripe.com">
            Stripe Dashboard
          </AdminExternalToolLink>
          <AdminExternalToolLink href="https://vercel.com/dashboard">
            Vercel
          </AdminExternalToolLink>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-ink">
            Prontidão de pagamentos
          </p>
          <StripeReadinessPanel />
        </div>
      </AdminSection>
    </div>
  );
}
