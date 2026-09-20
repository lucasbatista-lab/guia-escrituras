import { redirect } from "next/navigation";
import { DailyHomeSection } from "@/components/daily/daily-home-section";
import { PresenceLight } from "@/components/brand/presence-light";
import { PaperGrain } from "@/components/brand/paper-grain";
import { getAuthUserContext } from "@/lib/auth";
import {
  journeyAllowsChat,
  resolveUserJourneyState,
} from "@/lib/journey";

export const dynamic = "force-dynamic";

export default async function HojePage() {
  const auth = await getAuthUserContext();
  if (!auth) redirect("/entrar?next=/hoje");

  const { state } = await resolveUserJourneyState();
  const allowsChat = journeyAllowsChat(state);

  return (
    <div className="relative space-y-6 overflow-hidden">
      <PresenceLight size="sm" />
      <PaperGrain />
      <header className="relative z-10">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
          Presença
        </p>
        <h1 className="mt-1 font-display text-2xl text-ink sm:text-3xl">Hoje</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Um ritmo quieto para chegar, escutar e seguir — sem pressa.
        </p>
      </header>
      <div className="relative z-10">
        <DailyHomeSection userId={auth.userId} allowsChat={allowsChat} />
      </div>
    </div>
  );
}
