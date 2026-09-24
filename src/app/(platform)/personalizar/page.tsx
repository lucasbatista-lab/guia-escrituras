import { redirect } from "next/navigation";
import { PersonalizationForm } from "@/components/auth/onboarding-form";
import { AppScreenHeader } from "@/components/platform/app-screen-header";
import { getAuthUserContext } from "@/lib/auth";
import { safeNextPath } from "@/lib/navigation/safe-next-path";
import { journeyCanPersonalize } from "@/lib/daily/access";
import {
  getRequiredDestinationForState,
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

  if (!journeyCanPersonalize(state)) {
    redirect(getRequiredDestinationForState(state));
  }
  const params = await searchParams;
  const rawNext = params.next;
  const completionHref = safeNextPath(
    Array.isArray(rawNext) ? rawNext[0] : rawNext,
    "/inicio",
  );

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <AppScreenHeader
        title="Personalizar"
        subtitle="Escolha sua tradição para começar. Estilo e profundidade já têm padrões seguros."
      />
      <PersonalizationForm completionHref={completionHref} />
    </div>
  );
}
