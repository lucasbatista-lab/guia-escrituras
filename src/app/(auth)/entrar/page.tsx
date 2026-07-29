import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { authEntryMetadata } from "@/lib/seo/auth-metadata";

export const metadata = authEntryMetadata.entrar;

export default function EntrarPage() {
  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse sua conta para continuar suas conversas e jornada."
    >
      <Suspense
        fallback={
          <div
            className="min-h-[22rem] rounded-xl bg-sand-100/40"
            role="status"
            aria-label="Carregando formulário de acesso"
          />
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
