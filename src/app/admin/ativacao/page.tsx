import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminDataQualityBadge,
  AdminEmptyState,
  AdminKpi,
  AdminOpLink,
  AdminSection,
} from "@/components/admin/admin-primitives";
import { AdminMetricsError, getAdminActivationMetrics } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminAtivacaoPage() {
  let metrics;
  try {
    metrics = await getAdminActivationMetrics();
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return (
        <AdminEmptyState
          tone="error"
          title="Falha ao carregar ativação"
          description={error.message}
          actionHref="/admin/ativacao"
          actionLabel="Tentar de novo"
        />
      );
    }
    throw error;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Assinantes e produto"
        title="Ativação"
        description="Uso de produto a partir de profiles, subscriptions, conversations, journey_progress e signup_intents — sem conteúdo de conversas. Sem usuários ativos por dia/semana/mês nem retenção por coorte (não confiável com a estratégia atual de leitura)."
        meta={
          <>
            Dia operacional em Brasília (America/Sao_Paulo):{" "}
            <span className="capitalize text-ink">
              {metrics.operationalDayLabel}
            </span>
            . Atualizado em{" "}
            {new Date(metrics.generatedAt).toLocaleString("pt-BR")}.
          </>
        }
      />

      <AdminSection
        title="Assinantes ativos e uso do chat"
        description="Priorize quem paga mas nunca conversou; depois quem já usou e quem abandonou."
        tone="priority"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminKpi
            label="Ativos/trial e nunca conversaram"
            value={String(metrics.activeOrTrialingWithZeroConversations)}
            partial={metrics.activeOrTrialingWithZeroConversationsPartial}
            href="/admin/usuarios?active_no_conversation=1"
            hint="Fila operacional — primeiro contato ou reativação."
          />
          <AdminKpi
            label="Com ao menos 1 conversa (todos os usuários)"
            value={String(metrics.usersWithAtLeastOneConversation)}
            partial={metrics.usersWithAtLeastOneConversationPartial}
            hint="Inclui assinantes e cadastros sem plano ativo."
          />
          <AdminKpi
            label="Ativos/trial (agora)"
            value={String(metrics.activeOrTrialingUsers)}
            partial={metrics.activeOrTrialingPartial}
            href="/admin/usuarios?status=active"
          />
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <AdminOpLink href="/admin/usuarios?active_no_conversation=1">
            Fila: nunca usou
          </AdminOpLink>
          <AdminOpLink href="/admin/usuarios?inactive_days=7">
            Fila: parou de usar (≥ 7 dias)
          </AdminOpLink>
          <AdminOpLink href="/admin/usuarios?inactive_days=14">
            Parou de usar (≥ 14 dias)
          </AdminOpLink>
          <AdminOpLink href="/admin/usuarios?inactive_days=30">
            Parou de usar (≥ 30 dias)
          </AdminOpLink>
        </div>
      </AdminSection>

      <AdminSection
        title="Cadastros"
        description="“Hoje” usa a meia-noite em Brasília; 7/30 dias são janelas rolantes (não mês/semana civil)."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminKpi
            label="Novos hoje (Brasília)"
            value={String(metrics.newUsersToday)}
            href="/admin/usuarios"
          />
          <AdminKpi
            label="Novos (7 dias, rolante)"
            value={String(metrics.newUsers7d)}
          />
          <AdminKpi
            label="Novos (30 dias, rolante)"
            value={String(metrics.newUsers30d)}
          />
          <AdminKpi
            label="Cadastrados (total)"
            value={String(metrics.registeredUsers)}
            href="/admin/usuarios"
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Jornadas"
        description="Uma linha por (usuário, jornada) em journey_progress — não é contagem de usuários únicos."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminKpi
            label="Jornadas iniciadas"
            value={String(metrics.journeysStarted)}
            partial={metrics.journeyDataPartial}
          />
          <AdminKpi
            label="Jornadas concluídas"
            value={String(metrics.journeysCompleted)}
            partial={metrics.journeyDataPartial}
          />
          <AdminKpi
            label="Jornadas em andamento"
            value={String(metrics.journeysInProgress)}
            partial={metrics.journeyDataPartial}
          />
        </div>
        {metrics.journeyDistribution.length === 0 ? (
          <AdminEmptyState
            tone="empty"
            title="Sem progresso de jornada registrado"
            description="Quando usuários iniciarem jornadas, a distribuição por slug aparece aqui."
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {metrics.journeyDistribution.map((row) => (
              <li
                key={row.journeySlug}
                className="flex justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <span className="font-mono text-xs text-ink">
                  {row.journeySlug}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-ink-soft">
                  {row.started} iniciadas · {row.completed} concluídas
                  {metrics.journeyDataPartial ? (
                    <AdminDataQualityBadge quality="parcial" />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection
        title="Aprofundar (Profundo)"
        description="Métrica ainda indisponível com precisão — não compete com os KPIs acima."
        tone="muted"
      >
        <p className="text-sm text-ink-soft">
          <AdminDataQualityBadge quality="indisponivel" className="mr-2" />
          {metrics.aprofundarAvailabilityNote} — exigiria agregação exata de
          usage_events, que hoje é parcial sob volume típico. Não estimamos
          esse total a partir de leituras parciais.
        </p>
      </AdminSection>
    </div>
  );
}
