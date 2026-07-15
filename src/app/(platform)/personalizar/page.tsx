import { redirect } from "next/navigation";
import { PersonalizationForm } from "@/components/auth/onboarding-form";
import { PurchaseJourneySteps } from "@/components/marketing/purchase-journey-steps";
import { PlatformPageHeader } from "@/components/platform/page-header";
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
    <div className="mx-auto max-w-xl space-y-8">
      <PurchaseJourneySteps current="personalizacao" />
      <PlatformPageHeader
        title="Personalize sua experiência"
        description="Conte-nos como você prefere receber suas reflexões."
      />
      <PersonalizationForm />
    </div>
  );
}
