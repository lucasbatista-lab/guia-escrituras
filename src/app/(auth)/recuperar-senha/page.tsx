import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { brand } from "@/config/brand";
import { authPrivateMetadata } from "@/lib/seo/auth-metadata";

export const metadata = authPrivateMetadata("Recuperar senha");

export default function RecuperarSenhaPage() {
  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviaremos um link seguro para você criar uma nova senha."
    >
      <Suspense fallback={<p className="text-sm text-ink-soft">Carregando…</p>}>
        <ForgotPasswordForm supportEmail={brand.supportEmail} />
      </Suspense>
    </AuthShell>
  );
}
