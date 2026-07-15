"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "@/lib/auth/password-reset-action";
import { hasSupabaseEnv } from "@/lib/utils";

const RECOVERY_ERRORS: Record<string, string> = {
  token: "Este link é inválido ou incompleto. Solicite um novo.",
  expired: "Este link expirou. Solicite um novo para continuar.",
  session: "Não foi possível abrir a redefinição. Solicite um novo link.",
  type: "Este link é inválido. Solicite um novo.",
};

export function ForgotPasswordForm({
  supportEmail,
}: {
  supportEmail: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const initialError =
    errorParam && RECOVERY_ERRORS[errorParam]
      ? RECOVERY_ERRORS[errorParam]
      : null;

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!hasSupabaseEnv()) {
        setError(
          "Recuperação indisponível neste ambiente. Tente novamente mais tarde.",
        );
        return;
      }

      const result = await requestPasswordResetAction({ email });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.push(result.redirectTo);
      router.refresh();
    } catch {
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="w-full bg-ink hover:bg-ink/90"
        disabled={loading || !hasSupabaseEnv()}
      >
        {loading ? "Enviando…" : "Enviar link de recuperação"}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        <Link href="/entrar" className="underline-offset-4 hover:underline">
          Voltar ao login
        </Link>
      </p>
      {supportEmail ? (
        <p className="text-center text-xs text-ink-soft">
          Precisa de ajuda?{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="text-ink underline-offset-4 hover:underline"
          >
            {supportEmail}
          </a>
        </p>
      ) : null}
    </form>
  );
}
