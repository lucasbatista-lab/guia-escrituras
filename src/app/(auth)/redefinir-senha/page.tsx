import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { getAuthUserContext } from "@/lib/auth/session";
import { authPrivateMetadata } from "@/lib/seo/auth-metadata";

export const metadata = authPrivateMetadata("Redefinir senha");

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const okRaw = params.ok;
  const ok = (Array.isArray(okRaw) ? okRaw[0] : okRaw) === "1";
  const auth = await getAuthUserContext();

  if (!auth || auth.demoMode) {
    redirect("/recuperar-senha?error=session");
  }

  if (ok) {
    return (
      <AuthShell
        title="Senha atualizada"
        subtitle="Sua nova senha já está ativa. Você pode continuar no Amém Chat."
      >
        <div className="space-y-4" role="status" aria-live="polite">
          <p className="text-sm text-ink-soft">
            Guarde sua senha em um lugar seguro. Você já está com a sessão ativa.
          </p>
          <Button asChild className="w-full bg-ink hover:bg-ink/90">
            <Link href="/inicio">Entrar no Amém Chat</Link>
          </Button>
          <p className="text-center text-sm text-ink-soft">
            <Link
              href="/conta"
              className="underline-offset-4 hover:underline"
            >
              Ir para a conta
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nova senha"
      subtitle="Escolha uma senha forte para proteger sua conta."
    >
      <UpdatePasswordForm supportEmail={brand.supportEmail} />
    </AuthShell>
  );
}
