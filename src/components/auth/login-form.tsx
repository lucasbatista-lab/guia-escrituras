"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/login-action";
import { hasSupabaseEnv } from "@/lib/utils";

const AUTH_LINK_ERRORS: Record<string, string> = {
  token: "Este link é inválido ou incompleto. Solicite um novo e-mail.",
  expired: "Este link expirou. Solicite um novo e-mail para continuar.",
  session:
    "Não foi possível concluir a confirmação. Tente entrar ou peça um novo link.",
  type: "Este link é inválido. Solicite um novo e-mail.",
  confirm: "Não foi possível confirmar o acesso. Tente novamente.",
  config: "Autenticação temporariamente indisponível. Tente mais tarde.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const errorParam = searchParams.get("error");
  const linkError =
    errorParam && AUTH_LINK_ERRORS[errorParam]
      ? AUTH_LINK_ERRORS[errorParam]
      : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(linkError);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!hasSupabaseEnv()) {
        setError(
          "Autenticação indisponível: configure o Supabase. Em desenvolvimento local, defina as variáveis públicas.",
        );
        return;
      }

      const result = await loginAction({
        email,
        password,
        next: nextParam,
      });

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
      {!hasSupabaseEnv() && (
        <p className="rounded-md bg-sand-200/70 px-3 py-2 text-xs text-ink-soft">
          Supabase ainda não configurado neste ambiente. O login real exige
          NEXT_PUBLIC_SUPABASE_URL e a publishable key.
        </p>
      )}
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
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full bg-ink hover:bg-ink/90"
        disabled={loading || !hasSupabaseEnv()}
      >
        {loading ? "Entrando…" : "Entrar"}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        Não tem conta?{" "}
        <Link
          href="/cadastro"
          className="text-ink underline-offset-4 hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
      <p className="text-center text-sm text-ink-soft">
        <Link
          href="/recuperar-senha"
          className="underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
