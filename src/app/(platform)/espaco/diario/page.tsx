import { redirect } from "next/navigation";
import { JournalWorkspace } from "@/components/workspace/journal-workspace";
import { WorkspaceSubnav } from "@/components/workspace/workspace-subnav";
import { getAuthUserContext } from "@/lib/auth";
import { brtCalendarDate } from "@/lib/daily";
import { listPrivateEntries } from "@/lib/workspace/entries";

export const dynamic = "force-dynamic";

export default async function DiarioPage() {
  const auth = await getAuthUserContext();
  if (!auth) redirect("/entrar?next=/espaco/diario");
  const entries = await listPrivateEntries(auth.userId);

  return (
    <div className="space-y-6">
      <WorkspaceSubnav current="/espaco/diario" />
      <JournalWorkspace initial={entries} today={brtCalendarDate()} />
    </div>
  );
}
