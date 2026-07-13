"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  cancelSubscriptionRenewalAction,
  reactivateSubscriptionRenewalAction,
} from "@/lib/billing/subscription-actions";

interface Props {
  planName: string;
  accessUntilLabel: string | null;
  cancelAtPeriodEnd: boolean;
  canCancelRenewal: boolean;
  canReactivate: boolean;
  isManualOnly: boolean;
  hasStripeManagedSubscription: boolean;
}

export function SubscriptionManagementPanel({
  planName,
  accessUntilLabel,
  cancelAtPeriodEnd,
  canCancelRenewal,
  canReactivate,
  isManualOnly,
  hasStripeManagedSubscription,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isManualOnly || !hasStripeManagedSubscription) {
    return (
      <p className="text-sm text-ink-soft">
        Esta assinatura não está vinculada à cobrança online. Em caso de dúvida,
        fale com o suporte.
      </p>
    );
  }

  function onCancelConfirm() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await cancelSubscriptionRenewalAction();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirmOpen(false);
      setMessage(result.message);
      router.refresh();
    });
  }

  function onReactivate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await reactivateSubscriptionRenewalAction();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {cancelAtPeriodEnd ? (
        <div className="space-y-3">
          <p className="text-sm text-ink">
            Renovação cancelada. Você mantém acesso ao plano {planName}
            {accessUntilLabel ? ` até ${accessUntilLabel}` : ""}.
          </p>
          {canReactivate ? (
            <Button
              type="button"
              onClick={onReactivate}
              disabled={pending}
              className="bg-ink hover:bg-ink/90"
            >
              {pending ? "Salvando…" : "Manter minha assinatura"}
            </Button>
          ) : null}
        </div>
      ) : canCancelRenewal ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
        >
          Cancelar renovação
        </Button>
      ) : null}

      {confirmOpen ? (
        <div
          className="rounded-xl border border-border/80 bg-sand-50/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-renewal-title"
        >
          <h3 id="cancel-renewal-title" className="font-display text-lg text-ink">
            Confirmar cancelamento da renovação
          </h3>
          <p className="mt-2 text-sm text-ink-soft">
            Você continuará com acesso ao plano {planName}
            {accessUntilLabel ? ` até ${accessUntilLabel}` : " até o fim do período atual"}.
            Depois dessa data, não haverá uma nova cobrança.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={onCancelConfirm}
              disabled={pending}
              className="bg-ink hover:bg-ink/90"
            >
              {pending ? "Confirmando…" : "Confirmar cancelamento"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              Voltar
            </Button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="text-sm text-ink" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
