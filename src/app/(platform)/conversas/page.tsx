import Link from "next/link";
import { redirect } from "next/navigation";
import { ConversationHistoryList } from "@/components/conversations/conversation-history-list";
import { EmptyState } from "@/components/platform/empty-state";
import { InlineNotice } from "@/components/platform/inline-notice";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { RefreshPageButton } from "@/components/platform/refresh-page-button";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
import {
  HISTORY_LIST_DEFAULT_LIMIT,
  HISTORY_PREVIEW_FETCH_CAP,
  resolveHistoryListLimit,
  type HistoryListItem,
} from "@/lib/conversations/history-list";
import { sanitizeConversationPreview } from "@/lib/conversations/resume";
import { getRepositories } from "@/lib/database/repositories";
import { canUseReadingJourneys } from "@/lib/entitlements";
import {
  getRequiredDestinationForState,
  journeyAllowsChat,
  resolveUserJourneyState,
} from "@/lib/journey";

export const dynamic = "force-dynamic";

export default async function ConversasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/conversas");
  }

  const journey = await resolveUserJourneyState();
  if (!journeyAllowsChat(journey.state)) {
    redirect(getRequiredDestinationForState(journey.state));
  }

  const params = await searchParams;
  const maisRaw = params.mais;
  const maisParam = Array.isArray(maisRaw) ? maisRaw[0] : maisRaw;
  const { limit, expanded } = resolveHistoryListLimit(maisParam);

  let rows: HistoryListItem[] = [];
  let loadError = false;
  try {
    const repos = getRepositories();
    const list = await repos.conversations.listForUser(auth.userId, limit);
    const base = list.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
      preview: null as string | null,
    }));

    const previewSlice = base.slice(0, HISTORY_PREVIEW_FETCH_CAP);
    const previews = await Promise.all(
      previewSlice.map(async (row) => {
        try {
          const latest = await repos.messages.findLatestUserMessage(
            row.id,
            auth.userId,
          );
          const snippet = latest?.content
            ? sanitizeConversationPreview(latest.content)
            : "";
          return { id: row.id, preview: snippet || null };
        } catch {
          return { id: row.id, preview: null };
        }
      }),
    );
    const previewById = new Map(previews.map((p) => [p.id, p.preview]));
    rows = base.map((row) => ({
      ...row,
      preview: previewById.get(row.id) ?? null,
    }));
  } catch {
    loadError = true;
    rows = [];
  }

  const showLoadMore =
    !expanded && !loadError && rows.length >= HISTORY_LIST_DEFAULT_LIMIT;
  const canJourneys = canUseReadingJourneys(auth.planKey);

  return (
    <div className="space-y-8">
      <PlatformPageHeader
        title="Conversas"
        description="Retome reflexões anteriores quando quiser — privadas e visíveis só para você."
        actions={
          <Button asChild className="min-h-11 bg-ink hover:bg-ink/90">
            <Link href="/conversar">Nova reflexão</Link>
          </Button>
        }
      />

      {loadError ? (
        <div
          className="space-y-4 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-5 sm:px-5"
          role="alert"
        >
          <InlineNotice tone="error">
            Não foi possível carregar suas conversas agora. Tente novamente em
            instantes.
          </InlineNotice>
          <div className="flex flex-wrap gap-2">
            <RefreshPageButton />
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/conversar">Começar uma reflexão</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/inicio">Ir para o início</Link>
            </Button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="Nenhuma conversa ainda"
            description="Quando você iniciar uma reflexão, ela ficará disponível aqui para retomar com calma — sem precisar recomeçar do zero."
            actionHref="/conversar"
            actionLabel="Começar uma reflexão"
          />
          {canJourneys ? (
            <div className="rounded-2xl border border-border/70 bg-card/60 px-4 py-4 sm:px-5">
              <p className="font-medium text-ink">Prefere um caminho guiado?</p>
              <p className="mt-1 text-sm text-ink-soft">
                As Jornadas de leitura ajudam a manter continuidade com etapas
                claras — no seu ritmo.
              </p>
              <Button asChild variant="outline" className="mt-3 min-h-11">
                <Link href="/jornadas">Ver Jornadas</Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <ConversationHistoryList
          items={rows}
          latestId={rows[0]?.id ?? null}
          showLoadMore={showLoadMore}
          loadMoreHref="/conversas?mais=1"
        />
      )}
    </div>
  );
}
