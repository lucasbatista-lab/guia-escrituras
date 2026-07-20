"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
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
  const emailRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!hasSupabaseEnv()) {
        setError(
          "Autenticação indisponível: configure o Supabase. Em desenvolvimento local, defina as variáveis públicas.",
        );
        queueMicrotask(() => errorRef.current?.focus());
        return;
      }

      const result = await loginAction({
        email,
        password,
        next: nextParam,
      });

      if (!result.ok) {
        setError(result.message);
        queueMicrotask(() => emailRef.current?.focus());
        return;
      }

      router.push(result.redirectTo);
      router.refresh();
    } catch {
      setError("Algo deu errado. Tente novamente.");
      queueMicrotask(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {!hasSupabaseEnv() && (
        <p className="rounded-md bg-sand-200/70 px-3 py-2 text-xs text-ink-soft">
          Supabase ainda não configurado neste ambiente. O login real exige
          NEXT_PUBLIC_SUPABASE_URL e a publishable key.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>
      {error && (
        <p
          ref={errorRef}
          id="login-error"
          tabIndex={-1}
          className="text-sm text-destructive outline-none"
          role="alert"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="min-h-11 w-full bg-ink hover:bg-ink/90"
        disabled={loading || !hasSupabaseEnv()}
        aria-busy={loading}
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
