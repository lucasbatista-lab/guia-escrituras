import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default function OnboardingPage() {
  return (
    <AuthShell
      title="Seu perfil espiritual"
      subtitle="Essas preferências compõem a política teológica das respostas — e podem ser ajustadas depois."
    >
      <OnboardingForm />
    </AuthShell>
  );
}
