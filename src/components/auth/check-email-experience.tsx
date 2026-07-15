"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendConfirmationAction } from "@/lib/auth/resend-confirmation-action";
import { requestPasswordResetAction } from "@/lib/auth/password-reset-action";

const RESEND_COOLDOWN_SECONDS = 60;

export function CheckEmailExperience({
  emailHint,
  planName,
  planKey,
  mode = "signup",
  supportEmail,
}: {
  emailHint: string | null;
  planName: string | null;
  planKey: string | null;
  mode?: "signup" | "recovery";
  supportEmail: string | null;
}) {
  const isRecovery = mode === "recovery";
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  async function onResend() {
    if (resendCooldown > 0 || resendLoading || !resendEmail.trim()) return;
    setResendFeedback(null);
    setResendLoading(true);
    try {
      const result = isRecovery
        ? await requestPasswordResetAction({ email: resendEmail })
        : await resendConfirmationAction({ email: resendEmail });
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

  const correctHref = isRecovery
    ? "/recuperar-senha"
    : planKey
      ? `/cadastro?plan=${planKey}`
      : "/cadastro";

  return (
    <div className="space-y-8 rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-wine/10 text-wine"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7.5 11.3 12.7a1.4 1.4 0 0 0 1.4 0L21 7.5M5 18h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z"
            />
          </svg>
        </div>
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="font-display text-3xl text-ink outline-none"
        >
          Confira seu e-mail
        </h1>
        {emailHint ? (
          <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
            {isRecovery
              ? "Enviamos um link de recuperação para "
              : "Enviamos um link de confirmação para "}
            <span className="font-medium text-ink">{emailHint}</span>.
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
            {isRecovery
              ? "Se o e-mail existir, enviamos um link para redefinir a senha."
              : "Enviamos um link de confirmação para o e-mail informado."}
          </p>
        )}
        {!isRecovery && planName ? (
          <p className="mt-2 rounded-md bg-sand-100 px-3 py-1.5 text-sm text-ink">
            Plano reservado: <strong>{planName}</strong>
          </p>
        ) : null}
      </div>

      <ol className="space-y-3 text-sm text-ink-soft">
        <li className="flex gap-3">
          <span className="font-display text-lg text-ink">1</span>
          <span>Abra o e-mail que acabamos de enviar.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-display text-lg text-ink">2</span>
          <span>
            {isRecovery
              ? "Abra o link seguro para criar uma nova senha."
              : "Confirme sua conta pelo link seguro."}
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-display text-lg text-ink">3</span>
          <span>
            {isRecovery
              ? "Depois, entre no Amém Chat com a nova senha."
              : planKey
                ? "Conclua o pagamento para liberar sua experiência."
                : "Escolha um plano e conclua o pagamento."}
          </span>
        </li>
      </ol>

      {!isRecovery ? (
        <p className="rounded-md border border-border/60 bg-sand-50/80 px-3 py-2 text-xs leading-relaxed text-ink-soft">
          Nenhuma cobrança ocorreu. O pagamento só acontece depois da confirmação
          do e-mail, no checkout seguro.
        </p>
      ) : (
        <p className="rounded-md border border-border/60 bg-sand-50/80 px-3 py-2 text-xs leading-relaxed text-ink-soft">
          O link funciona neste ou em outro navegador. Se não usar, sua senha
          atual permanece a mesma.
        </p>
      )}

      <div className="space-y-3 border-t border-border/60 pt-5">
        <p className="text-sm font-medium text-ink">Não recebeu o e-mail?</p>
        <div className="space-y-2">
          <Label htmlFor="resend-email">E-mail para reenvio</Label>
          <Input
            id="resend-email"
            type="email"
            autoComplete="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void onResend()}
          disabled={resendLoading || resendCooldown > 0 || !resendEmail.trim()}
        >
          {resendLoading
            ? "Reenviando…"
            : resendCooldown > 0
              ? `Reenviar em ${resendCooldown}s`
              : isRecovery
                ? "Reenviar link de recuperação"
                : "Reenviar e-mail de confirmação"}
        </Button>
        {resendFeedback ? (
          <p className="text-xs text-ink-soft" role="status" aria-live="polite">
            {resendFeedback}
          </p>
        ) : null}
        <p className="text-center text-sm text-ink-soft">
          Digitou errado?{" "}
          <Link
            href={correctHref}
            className="text-ink underline-offset-4 hover:underline"
          >
            Corrigir e-mail
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
      </div>
    </div>
  );
}
