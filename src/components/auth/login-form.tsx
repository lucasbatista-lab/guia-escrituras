"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { loginAction } from "@/lib/auth/login-action";
import { hasSupabaseEnv } from "@/lib/utils";

const AUTH_LINK_ERRORS: Record<string, string> = {
  token: "Este link é inválido ou incompleto. Solicite um novo e-mail.",
  expired: "Este link expirou. Solicite um novo e-mail para continuar.",
  session:
    "Não foi possível concluir a confirmação. Tente entrar ou peça um novo link.",
  type: "Este link é inválido. Solicite um novo e-mail.",
  already:
    "Este link já foi usado. Se sua conta já estiver confirmada, entre para continuar.",
  confirm: "Não foi possível confirmar o acesso. Tente novamente.",
  config: "Autenticação temporariamente indisponível. Tente mais tarde.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const errorParam = searchParams.get("error");
  const contextParam = searchParams.get("context");
  const showPostConfirmBanner =
    contextParam === "post_confirm" ||
    nextParam === "/email-confirmado" ||
    nextParam?.startsWith("/email-confirmado?");
  const linkError =
    errorParam && AUTH_LINK_ERRORS[errorParam]
      ? AUTH_LINK_ERRORS[errorParam]
      : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(linkError);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const signupHref =
    nextParam?.startsWith("/cadastro") ? nextParam : "/cadastro";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    setEmailNotConfirmed(false);
    submittingRef.current = true;
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
        if (result.code === "email_not_confirmed") {
          setEmailNotConfirmed(true);
        }
        queueMicrotask(() => emailRef.current?.focus());
        return;
      }

      window.location.assign(result.redirectTo);
    } catch {
      setError("Algo deu errado. Tente novamente.");
      queueMicrotask(() => errorRef.current?.focus());
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {showPostConfirmBanner ? (
        <div
          className="rounded-xl border border-gold/30 bg-sand-100/80 px-4 py-3 text-sm text-ink"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium">Seu e-mail foi confirmado.</p>
          <p className="mt-1 text-ink-soft">
            Entre para continuar sua assinatura.
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Use o mesmo e-mail e senha informados no cadastro.
          </p>
        </div>
      ) : null}
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
          placeholder="voce@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
          className="min-h-12 rounded-xl bg-background/80"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="flex gap-2">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            className="min-h-12 flex-1 rounded-xl bg-background/80"
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-12 rounded-xl"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            disabled={loading}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
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
      {emailNotConfirmed ? (
        <p className="text-sm text-ink-soft">
          <Link href="/confira-seu-email" className="text-ink underline-offset-4 hover:underline">
            Reenviar confirmação de e-mail
          </Link>
        </p>
      ) : null}
      <Button
        type="submit"
        className="min-h-12 w-full rounded-xl bg-wine text-base hover:bg-wine-soft"
        disabled={loading || !hasSupabaseEnv()}
        aria-busy={loading}
      >
        {loading ? "Entrando…" : "Entrar"}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        Não tem conta?{" "}
        <TrackingLink
          href={signupHref}
          className="text-ink underline-offset-4 hover:underline"
        >
          Cadastre-se
        </TrackingLink>
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
