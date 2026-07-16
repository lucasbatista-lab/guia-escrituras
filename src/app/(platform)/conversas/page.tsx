import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/platform/empty-state";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
import {
  conversationTitleLabel,
  formatConversationActivity,
} from "@/lib/conversations/resume";
import { getRepositories } from "@/lib/database/repositories";
import {
  getRequiredDestinationForState,
  journeyAllowsChat,
  resolveUserJourneyState,
} from "@/lib/journey";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 30;

export default async function ConversasPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/conversas");
  }

  const journey = await resolveUserJourneyState({ userId: auth.userId });
  if (!journeyAllowsChat(journey.state)) {
    redirect(getRequiredDestinationForState(journey.state));
  }

  let rows: Array<{ id: string; title: string | null; updatedAt: string }> = [];
  try {
    const repos = getRepositories();
    const list = await repos.conversations.listForUser(auth.userId, LIST_LIMIT);
    rows = list.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
    }));
  } catch {
    rows = [];
  }

  return (
    <div className="space-y-8">
      <PlatformPageHeader
        title="Conversas"
        description="Suas reflexões anteriores, privadas e visíveis só para você."
        actions={
          <Button asChild className="min-h-11 bg-ink hover:bg-ink/90">
            <Link href="/conversar">Nova reflexão</Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhuma conversa ainda"
          description="Quando você iniciar uma conversa, ela ficará disponível aqui para ser retomada."
          actionHref="/conversar"
          actionLabel="Começar uma reflexão"
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => {
            const isLatest = index === 0;
            return (
              <li key={row.id}>
                <Link
                  href={`/conversar?c=${row.id}`}
                  className={cn(
                    "block rounded-2xl border px-4 py-4 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:px-5",
                    isLatest
                      ? "border-wine/30 bg-wine/[0.04] hover:border-wine/40"
                      : "border-border/70 bg-card/70 hover:border-wine/25 hover:bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {isLatest ? (
                        <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-wine">
                          Mais recente
                        </p>
                      ) : null}
                      <h2 className="font-medium text-ink">
                        {conversationTitleLabel(row.title)}
                      </h2>
                    </div>
                    <time
                      dateTime={row.updatedAt}
                      className="shrink-0 text-xs text-ink-soft"
                    >
                      {formatConversationActivity(row.updatedAt)}
                    </time>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-soft">
                    {isLatest ? "Retomar conversa" : "Abrir conversa"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
