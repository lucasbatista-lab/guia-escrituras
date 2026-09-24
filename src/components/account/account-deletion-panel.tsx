"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account/account-deletion-constants";
import { hasSupabaseEnv } from "@/lib/utils";

export type AccountDeletionBillingHint =
  | "none"
  | "renews"
  | "canceling"
  | "manual";

interface Props {
  billingHint: AccountDeletionBillingHint;
}

function subscriptionCopy(hint: AccountDeletionBillingHint): string | null {
  switch (hint) {
    case "renews":
      return "Se a exclusão for confirmada, a renovação automática da sua assinatura na web será cancelada antes. Não haverá novas cobranças. Não há reembolso automático.";
    case "canceling":
      return "A renovação da sua assinatura na web já está cancelada. A exclusão da conta não altera faturas já emitidas.";
    case "manual":
      return "Esta assinatura não está vinculada à cobrança online. Em caso de dúvida sobre cobranças, fale com o suporte.";
    default:
      return null;
  }
}

function errorMessageForCode(code: string | undefined, status: number): string {
  if (code === "confirmation_required") {
    return `Digite ${ACCOUNT_DELETE_CONFIRMATION} para confirmar.`;
  }
  if (code === "subscription_cancel_failed") {
    return "Não foi possível cancelar a renovação da assinatura. Sua conta não foi excluída. Tente novamente em instantes.";
  }
  if (code === "unauthenticated" || status === 401) {
    return "Sua sessão expirou. Entre novamente para excluir a conta.";
  }
  if (status === 403) {
    return "Não foi possível concluir a exclusão neste momento.";
  }
  return "Não foi possível excluir a conta agora. Tente novamente em instantes.";
}

export function AccountDeletionPanel({ billingHint }: Props) {
  const router = useRouter();
  const titleId = useId();
  const confirmInputId = useId();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    confirmInputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !inFlight.current) {
        setOpen(false);
        setError(null);
        setConfirmation("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const confirmationMatches =
    confirmation.trim() === ACCOUNT_DELETE_CONFIRMATION;
  const billingNote = subscriptionCopy(billingHint);

  async function onConfirmDelete() {
    if (inFlight.current || pending || !confirmationMatches) return;
    inFlight.current = true;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmation.trim() }),
      });

      let payload: { code?: string; message?: string } = {};
      try {
        payload = (await response.json()) as { code?: string; message?: string };
      } catch {
        payload = {};
      }

      if (!response.ok) {
        setError(errorMessageForCode(payload.code, response.status));
        return;
      }

      try {
        if (hasSupabaseEnv()) {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.auth.signOut();
        }
      } catch {
        // Best-effort local sign-out — Auth user is already gone.
      }

      router.replace("/conta-excluida");
      router.refresh();
    } catch {
      setError(
        "Não foi possível excluir a conta agora. Tente novamente em instantes.",
      );
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }

  function onClose() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setConfirmation("");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Esta ação remove permanentemente sua conta e os dados associados listados
        na confirmação.
      </p>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        className="min-h-11 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
        disabled={pending}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Excluir conta
      </Button>

      {open ? (
        <div
          className="rounded-xl border border-destructive/30 bg-sand-50/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <h3 id={titleId} className="font-display text-lg text-ink">
            Excluir conta permanentemente?
          </h3>
          <p className="mt-2 text-sm text-ink-soft">
            Serão removidos: sua conta, orações, diário, itens salvos, histórico
            do ritual, progresso em jornadas, conversas e personalização.
          </p>
          {billingNote ? (
            <p className="mt-2 text-sm text-ink-soft">{billingNote}</p>
          ) : null}
          <p className="mt-2 text-sm text-ink-soft">
            Registros financeiros mínimos (como eventos de pagamento no provedor)
            podem ser mantidos conforme obrigações fiscais. Não há reembolso
            automático.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Antes, se quiser,{" "}
            <a
              href="#exportar-dados"
              className="text-ink underline underline-offset-4"
              onClick={onClose}
            >
              baixe seus dados
            </a>
            .
          </p>

          <label
            htmlFor={confirmInputId}
            className="mt-4 block text-sm font-medium text-ink"
          >
            Digite {ACCOUNT_DELETE_CONFIRMATION} para confirmar
          </label>
          <input
            ref={confirmInputRef}
            id={confirmInputId}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={confirmation}
            disabled={pending}
            onChange={(event) => setConfirmation(event.target.value)}
            className="mt-1.5 flex h-11 w-full max-w-xs rounded-md border border-input bg-background px-3 text-base text-ink outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-required="true"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={onConfirmDelete}
              disabled={pending || !confirmationMatches}
              aria-busy={pending}
            >
              {pending ? "Excluindo…" : "Excluir permanentemente"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={onClose}
            >
              Voltar
            </Button>
          </div>

          {error ? (
            <p
              className="mt-3 text-sm text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
