import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/platform/empty-state";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
import { getRepositories } from "@/lib/database/repositories";
import {
  getRequiredDestinationForState,
  journeyAllowsChat,
  resolveUserJourneyState,
} from "@/lib/journey";

function sanitizePreview(title: string | null): string {
  const raw = (title ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "Conversa sem título";
  // Avoid dumping long sensitive content in list previews.
  return raw.length > 72 ? `${raw.slice(0, 72).trim()}…` : raw;
}

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
    const list = await repos.conversations.listForUser(auth.userId, 30);
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
          description="Quando você começar a conversar, suas reflexões aparecerão aqui."
          actionHref="/conversar"
          actionLabel="Começar uma reflexão"
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/conversar?c=${row.id}`}
                className="block rounded-2xl border border-border/70 bg-card/70 px-4 py-4 transition hover:border-wine/25 hover:bg-card focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:px-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium text-ink">
                    {sanitizePreview(row.title)}
                  </h2>
                  <time
                    dateTime={row.updatedAt}
                    className="shrink-0 text-xs text-ink-soft"
                  >
                    {new Date(row.updatedAt).toLocaleDateString("pt-BR")}
                  </time>
                </div>
                <p className="mt-1.5 text-sm text-ink-soft">
                  Abrir conversa
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
