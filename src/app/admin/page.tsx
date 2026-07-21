import Link from "next/link";
import {
  AdminMetricsError,
  formatRevenueBrl,
  getAdminOverviewMetrics,
} from "@/lib/admin/metrics";
import { formatCancelingWithAccessMetric } from "@/lib/admin/format-canceling-metric";
import {
  alertLevelToLegacy,
  buildOperationalAlerts,
} from "@/lib/admin/operational-alerts";
import { formatPriceBRL } from "@/lib/entitlements";
import { StripeReadinessPanel } from "@/components/admin/stripe-readiness-panel";

export default async function AdminHomePage() {
  let metrics;
  try {
    metrics = await getAdminOverviewMetrics();
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <AdminError message={error.message} />;
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Visão geral</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Dados reais do banco. Sem conteúdo de conversas. Métricas de IA são
          estimativas (não fatura do provedor). Atualizado em{" "}
          {new Date(metrics.generatedAt).toLocaleString("pt-BR")}.
        </p>
        {metrics.aiMetricsPartial ? (
          <p className="mt-2 text-sm text-amber-800">
            Atenção: agregados de IA atingiram o limite de páginas e podem estar
            parciais.
          </p>
        ) : null}
      </div>

      <Section title="Resumo do dia">
        <p className="mb-3 text-sm text-ink-soft">
          Revisão rápida no celular — números agregados, sem mensagens.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Assinantes ativos"
            value={String(metrics.activeSubscriberUsers)}
            href="/admin/usuarios?status=active"
          />
          <Metric
            label="Novos usuários hoje"
            value={String(metrics.newUsersToday)}
            href="/admin/usuarios"
          />
          <Metric
            label="Pedidos de IA hoje"
            value={String(metrics.aiRequestsToday)}
            href="/admin/custos"
            hint="Estimativa operacional."
          />
          <Metric
            label="Alertas abertos"
            value={String(alerts.length)}
            hint={
              alerts.length === 0
                ? "Nenhum item na faixa de atenção."
                : "Priorize a seção Precisa da sua atenção."
            }
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <OpLink href="/admin/usuarios?canceling=1">
            Cancelando ({cancelingLabel})
          </OpLink>
          <OpLink href="/admin/usuarios?past_due=1">
            Past due ({metrics.pastDueSubscriptions})
          </OpLink>
          <OpLink href="/admin/aquisicao">Aquisição</OpLink>
          <OpLink href="/admin/eventos">Eventos</OpLink>
        </div>
      </Section>

      {alerts.length > 0 ? (
        <Section title="Precisa da sua atenção">
          <p className="mb-3 text-sm text-ink-soft">
            Itens operacionais com ação sugerida — toque para investigar no
            celular.
          </p>
          <ul className="space-y-2">
            {alerts.map((alert) => {
              const legacy = alertLevelToLegacy(alert.level);
              return (
                <li key={alert.key}>
                  <Link
                    href={alert.href}
                    className={
                      alert.level === "critical"
                        ? "flex min-h-11 flex-col gap-1 rounded-lg border border-red-700/40 bg-red-50 px-3 py-3 text-sm text-red-950 sm:flex-row sm:items-start sm:justify-between"
                        : alert.level === "attention"
                          ? "flex min-h-11 flex-col gap-1 rounded-lg border border-amber-700/40 bg-amber-50 px-3 py-3 text-sm text-amber-950 sm:flex-row sm:items-start sm:justify-between"
                          : "flex min-h-11 flex-col gap-1 rounded-lg border border-border/70 bg-sand-50 px-3 py-3 text-sm text-ink sm:flex-row sm:items-start sm:justify-between"
                    }
                  >
                    <span>
                      <span className="font-medium">{legacy}</span>
                      {" · "}
                      {alert.message}
                      <span className="mt-1 block text-xs opacity-90">
                        {alert.meaning} → {alert.investigate}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs underline underline-offset-2">
                      {alert.cta}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : (
        <Section title="Precisa da sua atenção">
          <p className="rounded-lg border border-border/60 bg-sand-50/80 px-3 py-3 text-sm text-ink-soft">
            Nenhum alerta operacional agora. Use os atalhos abaixo para revisões
            de rotina.
          </p>
        </Section>
      )}

      <Section title="Atalhos operacionais">
        <div className="flex flex-wrap gap-2 text-sm">
          <OpLink href="/admin/usuarios?status=none">
            Sem assinatura ({metrics.usersWithoutSubscription})
          </OpLink>
          <OpLink href="/admin/usuarios?canceling=1">
            Cancelando no fim do período ({cancelingLabel})
          </OpLink>
          <OpLink href="/admin/usuarios?past_due=1">
            Pagamento em atraso ({metrics.pastDueSubscriptions})
          </OpLink>
          <OpLink href="/admin/usuarios?checkout_pending=1">
            Checkouts pendentes ({metrics.checkoutsPending})
          </OpLink>
          <OpLink href="/admin/eventos?status=failed">
            Eventos failed ({metrics.paymentEventsFailed})
          </OpLink>
          <OpLink href="/admin/eventos?status=received_stuck">
            Received presos ({metrics.paymentEventsReceivedStuck})
          </OpLink>
        </div>
      </Section>

      <Section title="Prontidão de pagamentos">
        <StripeReadinessPanel />
      </Section>

      <Section title="Usuários">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Usuários totais" value={String(metrics.totalUsers)} />
          <Metric label="Novos hoje" value={String(metrics.newUsersToday)} />
          <Metric label="Novos (7 dias)" value={String(metrics.newUsers7d)} />
          <Metric label="Novos (30 dias)" value={String(metrics.newUsers30d)} />
          <Metric
            label="Confirmados sem assinatura"
            value={String(metrics.usersWithoutSubscription)}
            href="/admin/usuarios?status=none"
          />
        </div>
      </Section>

      <Section title="Assinaturas (efetivas)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Assinaturas ativas (efetivas)"
            value={String(metrics.activeSubscriberUsers)}
          />
          <Metric
            label="Em teste (trialing)"
            value={String(metrics.trialingSubscriberUsers)}
            href="/admin/usuarios?status=trialing"
          />
          <Metric
            label="Conversão cadastro → assinatura"
            value={
              metrics.signupToSubscriberRate == null
                ? "—"
                : `${(metrics.signupToSubscriberRate * 100).toFixed(1)}%`
            }
            hint="Assinantes efetivos ÷ usuários totais."
          />
          <Metric
            label="Renovação cancelada (acesso vigente)"
            value={cancelingLabel}
            href="/admin/usuarios?canceling=1"
            hint={
              metrics.cancelingWithAccessCount == null
                ? "Consulta à Stripe indisponível — não exibimos zero."
                : undefined
            }
          />
          <Metric
            label="Pagamento em atraso (past_due)"
            value={String(metrics.pastDueSubscriptions)}
            href="/admin/usuarios?past_due=1"
          />
          <Metric
            label="Assinaturas encerradas"
            value={String(metrics.canceledSubscriptions)}
            href="/admin/usuarios?status=canceled"
          />
          <Metric
            label="MRR estimado pelo preço de catálogo"
            value={formatPriceBRL(metrics.mrrCatalogBrlCents)}
            hint="Estimativa pelo catálogo — não é receita recebida da Stripe."
          />
          <Metric
            label="Receita real recebida"
            value={formatRevenueBrl(metrics.realRevenueBrlCents)}
            hint="Ainda não integrada."
          />
          <Metric
            label="Usuários com assinaturas duplicadas"
            value={String(metrics.usersWithDuplicateSubscriptions)}
            href="/admin/usuarios?duplicates=1"
          />
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {metrics.subscribersByPlan.map((row) => (
            <li
              key={row.planKey}
              className="flex justify-between rounded-lg border border-border/60 px-3 py-2"
            >
              <span className="capitalize text-ink">{row.planKey}</span>
              <span className="text-ink-soft">{row.count}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Origem dos assinantes">
        {metrics.subscribersByUtmSource.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Sem utm_source registrado nos signup_intents dos assinantes
            efetivos.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {metrics.subscribersByUtmSource.map((row) => (
              <li key={row.source}>
                <Link
                  href={
                    row.source === "(sem source)"
                      ? "/admin/usuarios"
                      : `/admin/usuarios?utm=${encodeURIComponent(row.source)}`
                  }
                  className="flex justify-between rounded-lg border border-border/60 px-3 py-2 hover:bg-sand-50"
                >
                  <span className="text-ink">{row.source}</span>
                  <span className="text-ink-soft">{row.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Checkout e pagamento">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Checkouts iniciados"
            value={String(metrics.checkoutsStarted)}
          />
          <Metric
            label="Checkouts concluídos"
            value={String(metrics.checkoutsCompleted)}
          />
          <Metric
            label="Checkouts pendentes"
            value={String(metrics.checkoutsPending)}
            href="/admin/usuarios?checkout_pending=1"
          />
          <Metric
            label="Pendentes/expirados ou cancelados"
            value={String(metrics.checkoutsExpiredOrCanceled)}
          />
          <Metric
            label="Checkout stuck (>30 min)"
            value={String(metrics.checkoutsStuckOver30m)}
            href="/admin/usuarios?checkout_pending=1"
          />
          <Metric
            label="payment_events received"
            value={String(metrics.paymentEventsReceived)}
            href="/admin/eventos?status=received"
          />
          <Metric
            label="received presos (>3 min)"
            value={String(metrics.paymentEventsReceivedStuck)}
            href="/admin/eventos?status=received_stuck"
          />
          <Metric
            label="payment_events failed"
            value={String(metrics.paymentEventsFailed)}
            href="/admin/eventos?status=failed"
          />
          <Metric
            label="payment_events processed"
            value={String(metrics.paymentEventsProcessed)}
          />
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          past_due, events failed, received e checkout pendente são estados
          distintos — não misturar sob “falha de pagamento”.
        </p>
      </Section>

      <Section title="IA (estimativa do provedor / planning)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Solicitações hoje"
            value={String(metrics.aiRequestsToday)}
          />
          <Metric
            label="Solicitações (30 dias)"
            value={String(metrics.aiRequests30d)}
          />
          <Metric
            label="Tokens entrada (30d)"
            value={metrics.aiInputTokens30d.toLocaleString("pt-BR")}
          />
          <Metric
            label="Tokens saída (30d)"
            value={metrics.aiOutputTokens30d.toLocaleString("pt-BR")}
          />
          <Metric
            label="Custo estimado BRL (30d)"
            value={formatPriceBRL(metrics.aiEstimatedCostBrlCents30d)}
            hint="Estimativa interna — não é fatura OpenAI."
          />
          <Metric
            label="Custo estimado USD micros (30d)"
            value={String(metrics.aiEstimatedCostUsdMicros30d)}
          />
          <Metric
            label="Latência média (30d)"
            value={
              metrics.aiAvgLatencyMs30d == null
                ? "—"
                : `${metrics.aiAvgLatencyMs30d} ms`
            }
          />
          <Metric
            label="Erros de IA (30d)"
            value={String(metrics.aiErrors30d)}
          />
        </div>
      </Section>

      <Section title="Indicações">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Atribuídas"
            value={String(metrics.referralsAttributed)}
          />
          <Metric
            label="1ª cobrança confirmada"
            value={String(metrics.referralsFirstPayment)}
          />
          <Metric
            label="2ª cobrança confirmada"
            value={String(metrics.referralsSecondPayment)}
          />
          <Metric
            label="Recompensas pendentes"
            value={String(metrics.referralsRewardPending)}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-border/70 bg-card/60 p-4 transition hover:border-ink/30"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
      {body}
    </div>
  );
}

function OpLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-ink hover:bg-sand-50"
    >
      {children}
    </Link>
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
