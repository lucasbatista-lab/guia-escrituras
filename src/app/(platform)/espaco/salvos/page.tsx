import Link from "next/link";
import { redirect } from "next/navigation";
import { ListRow } from "@/components/surfaces/list-row";
import { EmptyState } from "@/components/platform/empty-state";
import { WorkspaceSubnav } from "@/components/workspace/workspace-subnav";
import { getAuthUserContext } from "@/lib/auth";
import { listSavedItems } from "@/lib/workspace/saved";
import type { SavedItemType } from "@/lib/workspace/types";

export const dynamic = "force-dynamic";

function typeLabel(type: SavedItemType): string {
  switch (type) {
    case "daily":
      return "Hoje";
    case "journey_step":
      return "Caminho";
    case "editorial_prayer":
      return "Oração";
    case "passage":
      return "Passagem";
    default:
      return "Salvo";
  }
}

function humanDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default async function SalvosPage() {
  const auth = await getAuthUserContext();
  if (!auth) redirect("/entrar?next=/espaco/salvos");
  const items = await listSavedItems(auth.userId);

  return (
    <div className="space-y-6">
      <WorkspaceSubnav current="/espaco/salvos" />
      {items.length === 0 ? (
        <EmptyState
          title="Coleção vazia"
          description="Quando você salvar algo de Hoje, a coleção começa — sem inventar texto bíblico."
          actionHref="/hoje"
          actionLabel="Abrir Hoje"
        />
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ListRow className="py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                        {typeLabel(item.itemType)}
                      </p>
                      <p className="mt-1 text-base font-medium text-ink">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {humanDate(item.createdAt)}
                      </p>
                    </div>
                    <span aria-hidden className="text-ink-soft">
                      →
                    </span>
                  </ListRow>
                </Link>
              ) : (
                <ListRow className="py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                      {typeLabel(item.itemType)}
                    </p>
                    <p className="mt-1 text-base font-medium text-ink">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {humanDate(item.createdAt)}
                    </p>
                  </div>
                </ListRow>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
