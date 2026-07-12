import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function EntrarPage() {
  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse sua conta para continuar suas conversas e jornada."
    >
      <LoginForm />
    </AuthShell>
  );
}
