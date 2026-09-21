import { redirect } from "next/navigation";
import { DailyHomeSection } from "@/components/daily/daily-home-section";
import { getAuthUserContext } from "@/lib/auth";
import {
  journeyAllowsChat,
  resolveUserJourneyState,
} from "@/lib/journey";

export const dynamic = "force-dynamic";

export default async function HojePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await getAuthUserContext();
  if (!auth) redirect("/entrar?next=/hoje");

  const params = await searchParams;
  const diaRaw = params.dia;
  const dia = Array.isArray(diaRaw) ? diaRaw[0] : diaRaw;

  const { state } = await resolveUserJourneyState();
  const allowsChat = journeyAllowsChat(state);

  return (
    <DailyHomeSection
      userId={auth.userId}
      allowsChat={allowsChat}
      revisitDate={dia ?? null}
    />
  );
}
