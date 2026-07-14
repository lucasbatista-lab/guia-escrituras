import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUserContext } from "@/lib/auth";
import { getRepositories } from "@/lib/database/repositories";
import {
  getRequiredDestinationForState,
  journeyAllowsChat,
  resolveUserJourneyState,
} from "@/lib/journey";

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
    <div>
      <h1 className="font-display text-3xl text-ink">Conversas</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Histórico das suas conversas. Conteúdo privado — visível apenas para
        você.
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        {rows.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border/80 px-4 py-3 text-ink-soft">
            Nenhuma conversa ainda.{" "}
            <Link href="/conversar" className="underline underline-offset-4">
              Começar
            </Link>
          </li>
        ) : (
          rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/conversar?c=${row.id}`}
                className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3 hover:bg-card/80"
              >
                <span className="text-ink">
                  {row.title || "Conversa sem título"}
                </span>
                <span className="text-xs text-ink-soft">
                  {new Date(row.updatedAt).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
