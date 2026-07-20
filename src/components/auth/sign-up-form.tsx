"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPrivacyVersion, getTermsVersion } from "@/config/legal";
import { signUpAction } from "@/lib/auth/sign-up-action";
import type { SignupTrackingParams } from "@/lib/signup-intents";
import type { PlanKey } from "@/lib/entitlements";
import { hasSupabaseEnv } from "@/lib/utils";

function passwordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

export function SignUpForm({
  planKey = null,
  tracking,
}: {
  planKey?: PlanKey | null;
  tracking?: SignupTrackingParams;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldError, setFieldError] = useState<{
    email?: string;
    password?: string;
    terms?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [requestIdHint, setRequestIdHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLButtonElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  const termsVersion = getTermsVersion();
  const privacyVersion = getPrivacyVersion();
  const checks = useMemo(() => passwordChecks(password), [password]);

  function onPasswordKey(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState?.("CapsLock") ?? false);
  }

  function focusFirstError(next: {
    email?: string;
    password?: string;
    terms?: string;
    form?: boolean;
  }) {
    queueMicrotask(() => {
      if (next.email) emailRef.current?.focus();
      else if (next.password) passwordRef.current?.focus();
      else if (next.terms) termsRef.current?.focus();
      else if (next.form) formErrorRef.current?.focus();
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setRequestIdHint(null);
    setFieldError({});

    if (!termsAccepted) {
      const next = {
        terms:
          "Aceite os Termos de Uso e a Política de Privacidade para continuar.",
      };
      setFieldError(next);
      focusFirstError(next);
      return;
    }

    if (!checks.minLength || !checks.hasLetter || !checks.hasNumber) {
      const next = {
        password:
          "Use pelo menos 8 caracteres, incluindo letras e números.",
      };
      setFieldError(next);
      focusFirstError(next);
      return;
    }

    setLoading(true);

    try {
      if (!hasSupabaseEnv()) {
        setError(
          "Cadastro indisponível: configure o Supabase neste ambiente.",
        );
        focusFirstError({ form: true });
        return;
      }

      const result = await signUpAction({
        displayName,
        email,
        password,
        planKey,
        termsAccepted,
        tracking,
      });

      if (!result.ok) {
        if (result.code === "email_invalid") {
          setFieldError({ email: result.message });
          focusFirstError({ email: result.message });
        } else if (result.code === "password_weak") {
          setFieldError({ password: result.message });
          focusFirstError({ password: result.message });
        } else if (result.code === "terms_required") {
          setFieldError({ terms: result.message });
          focusFirstError({ terms: result.message });
        } else {
          setError(result.message);
          focusFirstError({ form: true });
        }
        if (result.code === "unexpected" || result.code === "email_service_unavailable") {
          setRequestIdHint(result.requestId.slice(0, 8));
        }
        return;
      }

      if (result.needsEmailConfirmation && result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }

      if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    } catch {
      setError(
        "Não foi possível criar a conta agora. Tente novamente em instantes.",
      );
      focusFirstError({ form: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {!hasSupabaseEnv() && (
        <p className="rounded-md bg-sand-200/70 px-3 py-2 text-xs text-ink-soft">
          Supabase ainda não configurado. O cadastro real exige as variáveis
          públicas do projeto.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={loading}
        />
      </div>
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
          aria-invalid={Boolean(fieldError.email)}
          aria-describedby={fieldError.email ? "email-error" : undefined}
        />
        {fieldError.email ? (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {fieldError.email}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="flex gap-2">
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onPasswordKey}
            onKeyUp={onPasswordKey}
            disabled={loading}
            aria-invalid={Boolean(fieldError.password)}
            aria-describedby={
              fieldError.password
                ? "password-error password-rules"
                : "password-rules"
            }
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            disabled={loading}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
        <ul
          id="password-rules"
          className="space-y-1 text-xs text-ink-soft"
          aria-live="polite"
        >
          <li className={checks.minLength ? "text-ink" : undefined}>
            {checks.minLength ? "✓" : "○"} Pelo menos 8 caracteres
          </li>
          <li className={checks.hasLetter ? "text-ink" : undefined}>
            {checks.hasLetter ? "✓" : "○"} Inclui letras
          </li>
          <li className={checks.hasNumber ? "text-ink" : undefined}>
            {checks.hasNumber ? "✓" : "○"} Inclui números
          </li>
        </ul>
        {capsLockOn ? (
          <p className="text-xs text-ink-soft" role="status">
            Caps Lock está ativado.
          </p>
        ) : null}
        {fieldError.password ? (
          <p
            id="password-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {fieldError.password}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-11 items-start gap-3 rounded-md border border-border/70 px-3 py-3">
        <Checkbox
          ref={termsRef}
          id="terms"
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
          aria-required
          aria-invalid={Boolean(fieldError.terms)}
          aria-describedby={fieldError.terms ? "terms-error" : undefined}
          disabled={loading}
          className="mt-0.5 h-5 w-5"
        />
        <Label htmlFor="terms" className="text-sm leading-relaxed text-ink-soft">
          Li e aceito os{" "}
          <Link
            href="/termos"
            className="text-ink underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link
            href="/privacidade"
            className="text-ink underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Privacidade
          </Link>
          .
          <span className="mt-1 block text-xs text-ink-soft/80">
            Versões: termos {termsVersion} · privacidade {privacyVersion}
          </span>
        </Label>
      </div>
      {fieldError.terms ? (
        <p className="text-sm text-destructive" role="alert" id="terms-error">
          {fieldError.terms}
        </p>
      ) : null}

      {error && (
        <p
          ref={formErrorRef}
          tabIndex={-1}
          className="text-sm text-destructive outline-none"
          role="alert"
        >
          {error}
          {requestIdHint ? (
            <span className="mt-1 block text-xs text-ink-soft">
              Ref: {requestIdHint}
            </span>
          ) : null}
        </p>
      )}

      <Button
        type="submit"
        className="min-h-11 w-full bg-ink hover:bg-ink/90"
        disabled={loading || !hasSupabaseEnv()}
        aria-busy={loading}
      >
        {loading ? "Criando…" : "Criar conta"}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-ink underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
