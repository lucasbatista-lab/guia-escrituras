import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function CadastroPage() {
  return (
    <AuthShell
      title="Criar conta"
      subtitle="Comece com um perfil espiritual que respeita sua tradição."
    >
      <SignUpForm />
    </AuthShell>
  );
}
