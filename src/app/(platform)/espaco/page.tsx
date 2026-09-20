import { redirect } from "next/navigation";
import { WorkspaceSubnav } from "@/components/workspace/workspace-subnav";
import { getAuthUserContext } from "@/lib/auth";
import {
  countMonthlyReflectionMoments,
  monthlyMomentsCopy,
} from "@/lib/workspace/moments";

export const dynamic = "force-dynamic";

export default async function EspacoPage() {
  const auth = await getAuthUserContext();
  if (!auth) redirect("/entrar?next=/espaco");

  const count = await countMonthlyReflectionMoments(auth.userId);
  const moments = monthlyMomentsCopy(count);

  return (
    <div className="space-y-6">
      <WorkspaceSubnav />
      {moments ? <p className="text-sm text-ink">{moments}</p> : null}
      <p className="text-sm leading-relaxed text-ink-soft">
        Escolha uma área acima. Este espaço existe para presença diária, sem
        custo de conversa.
      </p>
    </div>
  );
}
