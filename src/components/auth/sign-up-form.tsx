"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPrivacyVersion, getTermsVersion } from "@/config/legal";
import { resendConfirmationAction } from "@/lib/auth/resend-confirmation-action";
import { signUpAction } from "@/lib/auth/sign-up-action";
import type { SignupTrackingParams } from "@/lib/signup-intents";
import type { PlanKey } from "@/lib/entitlements";
import { hasSupabaseEnv } from "@/lib/utils";

const RESEND_COOLDOWN_SECONDS = 60;

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
  const [message, setMessage] = useState<string | null>(null);
  const [requestIdHint, setRequestIdHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  const termsVersion = getTermsVersion();
  const privacyVersion = getPrivacyVersion();
  const checks = useMemo(() => passwordChecks(password), [password]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  function onPasswordKey(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState?.("CapsLock") ?? false);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setRequestIdHint(null);
    setResendFeedback(null);
    setFieldError({});

    if (!termsAccepted) {
      setFieldError({
        terms: "Aceite os Termos de Uso e a Política de Privacidade para continuar.",
      });
      return;
    }

    if (!checks.minLength || !checks.hasLetter || !checks.hasNumber) {
      setFieldError({
        password:
          "Use pelo menos 8 caracteres, incluindo letras e números.",
      });
      return;
    }

    setLoading(true);

    try {
      if (!hasSupabaseEnv()) {
        setError(
          "Cadastro indisponível: configure o Supabase neste ambiente.",
        );
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
        } else if (result.code === "password_weak") {
          setFieldError({ password: result.message });
        } else if (result.code === "terms_required") {
          setFieldError({ terms: result.message });
        } else {
          setError(result.message);
        }
        if (result.code === "unexpected" || result.code === "email_service_unavailable") {
          setRequestIdHint(result.requestId.slice(0, 8));
        }
        if (
          result.code === "email_service_unavailable" ||
          result.code === "email_rate_limit"
        ) {
          setAwaitingConfirmation(true);
        }
        return;
      }

      if (result.needsEmailConfirmation) {
        setAwaitingConfirmation(true);
        setMessage(
          planKey
            ? "Conta criada. Verifique seu e-mail para confirmar e continuar com o pagamento."
            : "Conta criada. Verifique seu e-mail para confirmar e depois conclua o onboarding.",
        );
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
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (resendCooldown > 0 || resendLoading || !email.trim()) return;
    setResendFeedback(null);
    setResendLoading(true);
    try {
      const result = await resendConfirmationAction({ email });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      if (!result.ok) {
        setResendFeedback(result.message);
        return;
      }
      setResendFeedback(result.message);
    } catch {
      setResendFeedback(
        "Não foi possível reenviar o e-mail agora. Tente novamente em instantes.",
      );
    } finally {
      setResendLoading(false);
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
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          aria-invalid={Boolean(fieldError.email)}
        />
        {fieldError.email ? (
          <p className="text-sm text-destructive" role="alert">
            {fieldError.email}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="flex gap-2">
          <Input
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
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            disabled={loading}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
        <ul className="space-y-1 text-xs text-ink-soft" aria-live="polite">
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
          <p className="text-sm text-destructive" role="alert">
            {fieldError.password}
          </p>
        ) : null}
      </div>

      <div className="flex items-start gap-3 rounded-md border border-border/70 px-3 py-3">
        <Checkbox
          id="terms"
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
          aria-required
          aria-invalid={Boolean(fieldError.terms)}
          disabled={loading}
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
        <p className="text-sm text-destructive" role="alert">
          {error}
          {requestIdHint ? (
            <span className="mt-1 block text-xs text-ink-soft">
              Ref: {requestIdHint}
            </span>
          ) : null}
        </p>
      )}
      {message && (
        <p className="text-sm text-ink-soft" role="status">
          {message}
        </p>
      )}

      {awaitingConfirmation ? (
        <div className="space-y-2 rounded-md border border-border/70 bg-sand-50/80 p-3">
          <p className="text-sm text-ink">Não recebeu o e-mail?</p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void onResend()}
            disabled={resendLoading || resendCooldown > 0 || !email.trim()}
          >
            {resendLoading
              ? "Reenviando…"
              : resendCooldown > 0
                ? `Reenviar em ${resendCooldown}s`
                : "Reenviar e-mail de confirmação"}
          </Button>
          {resendFeedback ? (
            <p className="text-xs text-ink-soft" role="status">
              {resendFeedback}
            </p>
          ) : null}
        </div>
      ) : null}

      <Button
        type="submit"
        className="w-full bg-ink hover:bg-ink/90"
        disabled={loading || !hasSupabaseEnv()}
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
