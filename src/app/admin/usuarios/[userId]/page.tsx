import { notFound } from "next/navigation";
import {
  AdminMetricsError,
  getAdminUserDetail,
  paymentProcessingStatusLabelPt,
  resolveAdminUsersReturnHref,
  subscriptionStatusLabelPt,
  STRIPE_DASHBOARD_EXTERNAL_LABEL,
  EXTERNAL_LINK_TARGET,
  EXTERNAL_LINK_REL,
} from "@/lib/admin";
import { formatPriceBRL } from "@/lib/entitlements";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminEmptyState,
  AdminExternalToolLink,
  AdminOpLink,
} from "@/components/admin/admin-primitives";

export default async function AdminUsuarioDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await params;
  const rawSearch = await searchParams;
  const backHref = resolveAdminUsersReturnHref(rawSearch.return);

  let detail;
  try {
    detail = await getAdminUserDetail(userId);
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return (
        <AdminEmptyState
          tone="error"
          title="Falha ao carregar assinante"
          description={error.message}
          actionHref={backHref}
          actionLabel="Voltar para usuários"
        />
      );
    }
    throw error;
  }

  if (!detail) notFound();

  const serialized = JSON.stringify(detail);
  const leaksSecret =
    /sk_live_|sk_test_|whsec_|OPENAI_API_KEY/.test(serialized) ||
    (detail.stripeCustomerIdMasked != null &&
      serialized.includes("cus_") &&
      !serialized.includes("…") &&
      /cus_[A-Za-z0-9]{20,}/.test(serialized));

  const activeFlags = Object.entries(detail.flags).filter(([, on]) => on);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Assinantes e produto"
        title={detail.displayName ?? "Usuário"}
        description={detail.email ?? undefined}
        meta={
          <span className="font-mono text-xs">{detail.userIdMask}</span>
        }
        breadcrumb={{ href: backHref, label: "Voltar para usuários" }}
        actions={
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-11 items-center rounded-md border border-border/70 bg-card px-3 text-sm font-medium capitalize text-ink">
              {detail.planName ?? detail.planKey ?? "Sem plano"}
            </span>
            <span className="inline-flex min-h-11 items-center rounded-md border border-wine/30 bg-wine/5 px-3 text-sm font-medium text-ink">
              {subscriptionStatusLabelPt(detail.subscriptionStatus)}
            </span>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* 1. Status e alertas */}
          <section className="rounded-2xl border border-border/70 bg-card/60 p-4">
            <h2 className="font-display text-xl text-ink">Status e alertas</h2>
            {activeFlags.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">
                Nenhuma flag operacional ativa neste momento.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {activeFlags.map(([key]) => (
                  <li
                    key={key}
                    className="rounded-md border border-amber-700/40 bg-amber-50 px-3 py-1.5 text-amber-950"
                  >
                    {key}
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              {Object.entries(detail.flags)
                .filter(([, on]) => !on)
                .map(([key]) => (
                  <li key={key} className="text-xs">
                    {key}: não
                  </li>
                ))}
            </ul>
          </section>

          {/* 2. Conta e assinatura */}
          <section className="rounded-2xl border border-border/70 bg-card/60 p-4">
            <h2 className="font-display text-xl text-ink">Conta e assinatura</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Item
                label="Cadastro"
                value={new Date(detail.createdAt).toLocaleString("pt-BR")}
              />
              <Item
                label="Onboarding"
                value={
                  detail.onboardingCompleted == null
                    ? "—"
                    : detail.onboardingCompleted
                      ? "Concluído"
                      : "Pendente"
                }
              />
              <Item label="Tradição" value={detail.traditionLabel ?? "—"} />
              <Item
                label="Plano efetivo"
                value={detail.planName ?? detail.planKey ?? "—"}
              />
              <Item
                label="Status"
                value={subscriptionStatusLabelPt(detail.subscriptionStatus)}
              />
              <Item
                label="Período / validade"
                value={
                  detail.currentPeriodEnd
                    ? new Date(detail.currentPeriodEnd).toLocaleDateString(
                        "pt-BR",
                      )
                    : "—"
                }
              />
              <Item
                label="Renovação"
                value={
                  detail.cancelAtPeriodEnd == null
                    ? "—"
                    : detail.cancelAtPeriodEnd
                      ? "Cancelada para o fim do período"
                      : detail.renewsAutomatically
                        ? "Automática"
                        : "—"
                }
              />
              <Item label="Cartão" value={detail.cardLabel ?? "—"} />
            </dl>
          </section>

          {/* 4. Marcos operacionais */}
          <section className="rounded-2xl border border-border/70 bg-card/60 p-4">
            <h2 className="font-display text-xl text-ink">
              Marcos operacionais
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Timestamps e metadados existentes — com lacunas possíveis. Sem
              conteúdo de mensagens.
            </p>
            <ol className="mt-3 space-y-2 text-sm">
              {detail.operationalMilestones.map((m) => (
                <li
                  key={m.key}
                  className="rounded-lg border border-border/60 px-3 py-2"
                >
                  <p className="text-ink">{m.label}</p>
                  <p className="text-xs text-ink-soft">
                    {m.at
                      ? new Date(m.at).toLocaleString("pt-BR")
                      : m.known
                        ? "Sem timestamp"
                        : "Lacuna / desconhecido"}
                    {m.detail ? ` · ${m.detail}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* 5. Uso e ativação */}
          <section className="rounded-2xl border border-border/70 bg-card/60 p-4">
            <h2 className="font-display text-xl text-ink">Uso e ativação</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Item
                label="Consumo do mês"
                value={formatPriceBRL(detail.monthlyUsedBrlCents)}
              />
              <Item
                label="Requests no mês"
                value={String(detail.monthlyRequests)}
              />
              <Item
                label="Requests (7 dias)"
                value={String(detail.usageRequests7d)}
              />
              <Item
                label="Requests (30 dias)"
                value={String(detail.usageRequests30d)}
              />
              <Item
                label="Requests (total)"
                value={String(detail.usageRequestsTotal)}
              />
              <Item
                label="Conversas"
                value={String(detail.conversationCount)}
              />
              <Item
                label="Jornadas iniciadas"
                value={String(detail.journeyProgress.journeysStarted)}
              />
              <Item
                label="Jornadas concluídas"
                value={String(detail.journeyProgress.journeysCompleted)}
              />
              <Item
                label="Etapas de jornada"
                value={String(detail.journeyProgress.stepsCompleted)}
              />
              <Item
                label="Última atividade (jornadas)"
                value={
                  detail.journeyProgress.lastJourneyActivityAt
                    ? new Date(
                        detail.journeyProgress.lastJourneyActivityAt,
                      ).toLocaleString("pt-BR")
                    : "—"
                }
              />
              <Item
                label="Última atividade"
                value={
                  detail.lastActivityAt
                    ? new Date(detail.lastActivityAt).toLocaleString("pt-BR")
                    : "—"
                }
              />
              <Item
                label="Nível de franquia"
                value={detail.budgetLevel ?? "—"}
              />
            </dl>
            <p className="mt-3 text-xs text-ink-soft">
              {detail.monthlyEstimatedCostNote}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Contagem de conversas e uso sem conteúdo de mensagens.
            </p>
          </section>

          {/* 6. Aquisição */}
          <section className="rounded-2xl border border-border/70 bg-card/60 p-4">
            <h2 className="font-display text-xl text-ink">Aquisição</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Item
                label="Origem"
                value={
                  [detail.utmSource, detail.utmMedium, detail.utmCampaign]
                    .filter(Boolean)
                    .join(" / ") || "—"
                }
              />
              <Item
                label="Conteúdo (utm_content)"
                value={detail.utmContent ?? "—"}
              />
              <Item label="Referral" value={detail.referralCode ?? "—"} />
            </dl>
          </section>

          {/* 7. Pagamentos relacionados */}
          <section className="rounded-2xl border border-border/70 bg-card/60 p-4">
            <h2 className="font-display text-xl text-ink">
              Pagamentos relacionados
            </h2>
            {detail.paymentEventSummaries.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">
                Nenhum evento correlacionado.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {detail.paymentEventSummaries.map((e) => (
                  <li
                    key={`${e.type}-${e.createdAt}`}
                    className="rounded-lg border border-border/60 px-3 py-2"
                  >
                    {e.type} ·{" "}
                    {paymentProcessingStatusLabelPt(e.processingStatus)} ·{" "}
                    {new Date(e.createdAt).toLocaleString("pt-BR")}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* 3. Ações e atalhos read-only */}
          <section className="rounded-2xl border border-border/70 bg-sand-50/60 p-4">
            <h2 className="font-display text-lg text-ink">
              Ações e atalhos (somente leitura)
            </h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <AdminOpLink href="/admin/eventos">
                Eventos de pagamento
              </AdminOpLink>
              <AdminOpLink href="/admin/uso">Uso</AdminOpLink>
              <AdminOpLink href="/admin/aquisicao">Aquisição</AdminOpLink>
              {detail.utmSource ? (
                <AdminOpLink
                  href={`/admin/usuarios?utm=${encodeURIComponent(detail.utmSource)}`}
                >
                  Mesma origem ({detail.utmSource})
                </AdminOpLink>
              ) : null}
            </div>
          </section>

          {/* 8. Dados técnicos */}
          <section className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-4">
            <h2 className="font-display text-lg text-ink">Dados técnicos</h2>
            <p className="mt-1 text-xs text-ink-soft">
              IDs mascarados. Links externos abrem o Stripe Dashboard.
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <ItemWithExternalLink
                label="Customer (mascarado)"
                value={detail.stripeCustomerIdMasked ?? "—"}
                href={detail.stripeCustomerDashboardHref}
              />
              <ItemWithExternalLink
                label="Subscription (mascarado)"
                value={detail.stripeSubscriptionIdMasked ?? "—"}
                href={detail.stripeSubscriptionDashboardHref}
              />
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {detail.stripeCustomerDashboardHref ? (
                <AdminExternalToolLink href={detail.stripeCustomerDashboardHref}>
                  Stripe customer
                </AdminExternalToolLink>
              ) : null}
              {detail.stripeSubscriptionDashboardHref ? (
                <AdminExternalToolLink
                  href={detail.stripeSubscriptionDashboardHref}
                >
                  Stripe subscription
                </AdminExternalToolLink>
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      <span className="hidden" aria-hidden>
        {leaksSecret ? "LEAK" : "ok"}
      </span>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function ItemWithExternalLink({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string | null;
}) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-ink">
        {value}
        {href ? (
          <>
            {" · "}
            <a
              href={href}
              target={EXTERNAL_LINK_TARGET}
              rel={EXTERNAL_LINK_REL}
              className="text-xs underline underline-offset-2"
            >
              {STRIPE_DASHBOARD_EXTERNAL_LABEL}
            </a>
          </>
        ) : null}
      </dd>
    </div>
  );
}
