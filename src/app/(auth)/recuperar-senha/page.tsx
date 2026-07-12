import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function RecuperarSenhaPage() {
  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviaremos um link seguro para redefinir sua senha."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
