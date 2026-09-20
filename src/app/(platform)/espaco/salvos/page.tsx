import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceSubnav } from "@/components/workspace/workspace-subnav";
import { getAuthUserContext } from "@/lib/auth";
import { listSavedItems } from "@/lib/workspace/saved";

export const dynamic = "force-dynamic";

export default async function SalvosPage() {
  const auth = await getAuthUserContext();
  if (!auth) redirect("/entrar?next=/espaco/salvos");
  const items = await listSavedItems(auth.userId);

  return (
    <div className="space-y-6">
      <WorkspaceSubnav current="/espaco/salvos" />
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Quando você salvar o conteúdo de hoje, ele aparece aqui.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-border/70 bg-card/70 p-4"
            >
              <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
                {item.itemType === "daily" ? "Hoje com Deus" : item.itemType}
              </p>
              {item.href ? (
                <Link
                  href={item.href}
                  className="mt-1 block font-medium text-ink underline-offset-4 hover:underline"
                >
                  {item.title}
                </Link>
              ) : (
                <p className="mt-1 font-medium text-ink">{item.title}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
