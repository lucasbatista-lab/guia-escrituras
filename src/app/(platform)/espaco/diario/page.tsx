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
      <p className="text-sm leading-relaxed text-ink-soft">
        Página íntima — não é formulário de administração. O conteúdo do diário
        não entra em analytics nem IA.
      </p>
      <JournalWorkspace initial={entries} today={brtCalendarDate()} />
    </div>
  );
}
