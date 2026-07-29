import { redirect } from "next/navigation";
import { PersonalizationForm } from "@/components/auth/onboarding-form";
import { PlatformPageHeader } from "@/components/platform/page-header";
import { getAuthUserContext } from "@/lib/auth";
import { safeNextPath } from "@/lib/navigation/safe-next-path";
import {
  getRequiredDestinationForState,
  journeyHasEffectiveAccess,
  resolveUserJourneyState,
} from "@/lib/journey";

export default async function PersonalizarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/personalizar");
  }

  const { state } = await resolveUserJourneyState();

  if (!journeyHasEffectiveAccess(state)) {
    redirect(getRequiredDestinationForState(state));
  }
  const params = await searchParams;
  const rawNext = params.next;
  const completionHref = safeNextPath(
    Array.isArray(rawNext) ? rawNext[0] : rawNext,
    "/conversar",
  );

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PlatformPageHeader
        eyebrow="Seu espaço, do seu jeito"
        title="Personalize sua experiência"
        description="Escolha tradição, estilo e profundidade em três passos rápidos. Você poderá revisar tudo na Conta."
      />
      <PersonalizationForm completionHref={completionHref} />
    </div>
  );
}
