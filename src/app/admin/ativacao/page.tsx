import Link from "next/link";
import { AdminMetricsError, getAdminActivationMetrics } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminAtivacaoPage() {
  let metrics;
  try {
    metrics = await getAdminActivationMetrics();
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Ativação</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Uso de produto a partir de profiles, subscriptions, conversations,
          journey_progress e signup_intents — sem conteúdo de conversas. Sem
          usuários ativos por dia/semana/mês nem retenção por coorte (não
          confiável com a estratégia atual de leitura).
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Dia operacional em Brasília (America/Sao_Paulo):{" "}
          <span className="capitalize text-ink">{metrics.operationalDayLabel}</span>
          . Atualizado em {new Date(metrics.generatedAt).toLocaleString("pt-BR")}.
        </p>
      </div>

      <Section title="Cadastros">
        <p className="mb-3 text-sm text-ink-soft">
          &quot;Hoje&quot; usa a meia-noite em Brasília; 7/30 dias são janelas
          rolantes (não mês/semana civil).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Novos hoje (Brasília)"
            value={String(metrics.newUsersToday)}
            href="/admin/usuarios"
          />
          <Metric
            label="Novos (7 dias, rolante)"
            value={String(metrics.newUsers7d)}
          />
          <Metric
            label="Novos (30 dias, rolante)"
            value={String(metrics.newUsers30d)}
          />
          <Metric
            label="Cadastrados (total)"
            value={String(metrics.registeredUsers)}
            href="/admin/usuarios"
          />
        </div>
      </Section>

      <Section title="Assinantes ativos e uso do chat">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Ativos/trial (agora)"
            value={String(metrics.activeOrTrialingUsers)}
            partial={metrics.activeOrTrialingPartial}
            href="/admin/usuarios?status=active"
          />
          <Metric
            label="Ativos/trial e nunca conversaram"
            value={String(metrics.activeOrTrialingWithZeroConversations)}
            partial={metrics.activeOrTrialingWithZeroConversationsPartial}
            href="/admin/usuarios?active_no_conversation=1"
          />
          <Metric
            label="Com ao menos 1 conversa (todos os usuários)"
            value={String(metrics.usersWithAtLeastOneConversation)}
            partial={metrics.usersWithAtLeastOneConversationPartial}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <OpLink href="/admin/usuarios?active_no_conversation=1">
            Fila: nunca usou
          </OpLink>
          <OpLink href="/admin/usuarios?inactive_days=7">
            Fila: parou de usar (≥ 7 dias)
          </OpLink>
          <OpLink href="/admin/usuarios?inactive_days=14">
            Parou de usar (≥ 14 dias)
          </OpLink>
          <OpLink href="/admin/usuarios?inactive_days=30">
            Parou de usar (≥ 30 dias)
          </OpLink>
        </div>
      </Section>

      <Section title="Jornadas">
        <p className="mb-3 text-sm text-ink-soft">
          Uma linha por (usuário, jornada) em journey_progress — não é
          contagem de usuários únicos.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Jornadas iniciadas"
            value={String(metrics.journeysStarted)}
            partial={metrics.journeyDataPartial}
          />
          <Metric
            label="Jornadas concluídas"
            value={String(metrics.journeysCompleted)}
            partial={metrics.journeyDataPartial}
          />
          <Metric
            label="Jornadas em andamento"
            value={String(metrics.journeysInProgress)}
            partial={metrics.journeyDataPartial}
          />
        </div>
        {metrics.journeyDistribution.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            Sem progresso de jornada registrado ainda.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {metrics.journeyDistribution.map((row) => (
              <li
                key={row.journeySlug}
                className="flex justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <span className="font-mono text-xs text-ink">
                  {row.journeySlug}
                </span>
                <span className="text-ink-soft">
                  {row.started} iniciadas · {row.completed} concluídas
                  {metrics.journeyDataPartial ? " · PARCIAL" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Aprofundar (Profundo)">
        <p className="rounded-lg border border-border/60 bg-sand-50/80 px-3 py-3 text-sm text-ink-soft">
          <span className="mr-2 rounded border border-border/70 bg-card px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            INDISPONÍVEL
          </span>
          {metrics.aprofundarAvailabilityNote} — exigiria agregação exata de
          usage_events, que hoje é parcial sob volume típico. Não estimamos
          esse total a partir de leituras parciais.
        </p>
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
  href,
  partial = false,
}: {
  label: string;
  value: string;
  href?: string;
  partial?: boolean;
}) {
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
        {partial ? (
          <span className="rounded border border-amber-700/50 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950">
            PARCIAL
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-2xl text-ink">
        {partial ? `${value} · PARCIAL` : value}
      </p>
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

function OpLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-ink hover:bg-sand-50"
    >
      {children}
    </Link>
  );
}
