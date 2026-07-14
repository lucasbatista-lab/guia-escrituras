import { redirect } from "next/navigation";
import { PersonalizationForm } from "@/components/auth/onboarding-form";
import { getAuthUserContext } from "@/lib/auth";
import {
  getRequiredDestinationForState,
  journeyHasEffectiveAccess,
  resolveUserJourneyState,
} from "@/lib/journey";

export default async function PersonalizarPage() {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/personalizar");
  }

  const { state } = await resolveUserJourneyState({ userId: auth.userId });

  if (!journeyHasEffectiveAccess(state)) {
    redirect(getRequiredDestinationForState(state));
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl text-ink">
        Personalize sua experiência
      </h1>
      <p className="mt-2 text-ink-soft">
        Conte-nos como você prefere receber suas reflexões.
      </p>
      <div className="mt-8">
        <PersonalizationForm />
      </div>
    </div>
  );
}
