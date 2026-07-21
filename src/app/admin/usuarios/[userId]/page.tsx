import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminMetricsError,
  getAdminUserDetail,
  paymentProcessingStatusLabelPt,
  subscriptionStatusLabelPt,
} from "@/lib/admin";
import { formatPriceBRL } from "@/lib/entitlements";

export default async function AdminUsuarioDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  let detail;
  try {
    detail = await getAdminUserDetail(userId);
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <p className="text-sm text-destructive">{error.message}</p>;
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/usuarios"
          className="inline-flex min-h-11 items-center text-sm text-ink-soft underline"
        >
          ← Usuários
        </Link>
        <h1 className="mt-3 font-display text-3xl text-ink">
          {detail.displayName ?? "Usuário"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{detail.email}</p>
        <p className="font-mono text-xs text-ink-soft">{detail.userIdMask}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <OpLink href="/admin/eventos">Eventos de pagamento</OpLink>
        <OpLink href="/admin/uso">Uso</OpLink>
        <OpLink href="/admin/aquisicao">Aquisição</OpLink>
        {detail.utmSource ? (
          <OpLink href={`/admin/usuarios?utm=${encodeURIComponent(detail.utmSource)}`}>
            Mesma origem ({detail.utmSource})
          </OpLink>
        ) : null}
      </div>

      <dl className="grid gap-3 rounded-xl border border-border/70 p-4 text-sm sm:grid-cols-2">
        <Item label="Cadastro" value={new Date(detail.createdAt).toLocaleString("pt-BR")} />
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
        <Item label="Plano efetivo" value={detail.planName ?? detail.planKey ?? "—"} />
        <Item
          label="Status"
          value={subscriptionStatusLabelPt(detail.subscriptionStatus)}
        />
        <Item
          label="Período / validade"
          value={
            detail.currentPeriodEnd
              ? new Date(detail.currentPeriodEnd).toLocaleDateString("pt-BR")
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
        <Item
          label="Customer (mascarado)"
          value={detail.stripeCustomerIdMasked ?? "—"}
        />
        <Item
          label="Subscription (mascarado)"
          value={detail.stripeSubscriptionIdMasked ?? "—"}
        />
        <Item
          label="Consumo do mês"
          value={formatPriceBRL(detail.monthlyUsedBrlCents)}
        />
        <Item label="Requests no mês" value={String(detail.monthlyRequests)} />
        <Item label="Requests (7 dias)" value={String(detail.usageRequests7d)} />
        <Item label="Requests (30 dias)" value={String(detail.usageRequests30d)} />
        <Item label="Requests (total)" value={String(detail.usageRequestsTotal)} />
        <Item label="Conversas" value={String(detail.conversationCount)} />
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
        <Item label="Nível de franquia" value={detail.budgetLevel ?? "—"} />
        <Item
          label="Origem"
          value={
            [detail.utmSource, detail.utmMedium, detail.utmCampaign]
              .filter(Boolean)
              .join(" / ") || "—"
          }
        />
        <Item label="Conteúdo (utm_content)" value={detail.utmContent ?? "—"} />
        <Item label="Referral" value={detail.referralCode ?? "—"} />
      </dl>

      <p className="text-xs text-ink-soft">{detail.monthlyEstimatedCostNote}</p>
      <p className="text-xs text-ink-soft">
        Contagem de conversas e uso sem conteúdo de mensagens.
      </p>

      <section>
        <h2 className="font-display text-xl text-ink">Flags operacionais</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {Object.entries(detail.flags).map(([key, on]) => (
            <li
              key={key}
              className={
                on
                  ? "rounded-full border border-amber-700/40 bg-amber-50 px-3 py-1 text-amber-900"
                  : "rounded-full border border-border px-3 py-1 text-ink-soft"
              }
            >
              {key}: {on ? "sim" : "não"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl text-ink">Eventos de pagamento correlacionados</h2>
        {detail.paymentEventSummaries.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Nenhum evento correlacionado.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {detail.paymentEventSummaries.map((e) => (
              <li
                key={`${e.type}-${e.createdAt}`}
                className="rounded-lg border border-border/60 px-3 py-2"
              >
                {e.type} · {paymentProcessingStatusLabelPt(e.processingStatus)}{" "}
                · {new Date(e.createdAt).toLocaleString("pt-BR")}
              </li>
            ))}
          </ul>
        )}
      </section>

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

function OpLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-border/70 px-3 py-1.5 text-ink-soft hover:bg-sand-50 hover:text-ink"
    >
      {children}
    </Link>
  );
}
