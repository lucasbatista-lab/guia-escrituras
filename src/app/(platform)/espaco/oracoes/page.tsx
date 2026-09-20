import { redirect } from "next/navigation";
import { PrayerWorkspace } from "@/components/workspace/prayer-workspace";
import { WorkspaceSubnav } from "@/components/workspace/workspace-subnav";
import { getAuthUserContext } from "@/lib/auth";
import { listPrayers } from "@/lib/workspace/prayers";

export const dynamic = "force-dynamic";

export default async function OracoesPage() {
  const auth = await getAuthUserContext();
  if (!auth) redirect("/entrar?next=/espaco/oracoes");
  const prayers = await listPrayers(auth.userId);

  return (
    <div className="space-y-6">
      <WorkspaceSubnav current="/espaco/oracoes" />
      <PrayerWorkspace initial={prayers} />
    </div>
  );
}
