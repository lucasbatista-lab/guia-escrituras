/** Portuguese labels for admin subscription / payment states (pure, no secrets). */

export function subscriptionStatusLabelPt(status: string | null | undefined): string {
  switch (status) {
    case "active":
      return "Ativa";
    case "trialing":
      return "Em teste";
    case "past_due":
      return "Pagamento em atraso";
    case "canceled":
      return "Encerrada";
    case "incomplete":
      return "Incompleta";
    case "unpaid":
      return "Não paga";
    case null:
    case undefined:
    case "none":
      return "Sem assinatura";
    default:
      return status;
  }
}

export function paymentProcessingStatusLabelPt(status: string): string {
  switch (status) {
    case "received":
      return "Recebido";
    case "processing":
      return "Processando";
    case "processed":
      return "Processado";
    case "failed":
      return "Falhou";
    default:
      return status;
  }
}

/**
 * Humanized status for operator scanning — same states as
 * `paymentProcessingStatusLabelPt`, plus "Parado" for a `received` event
 * stuck past the webhook lease. Technical status stays visible separately.
 */
export function paymentProcessingStatusHumanLabelPt(
  status: string,
  isStuck: boolean,
): string {
  if (status === "received" && isStuck) return "Parado";
  return paymentProcessingStatusLabelPt(status);
}

/** Label shown when a payment_events row cannot be linked to exactly one user. */
export const PAYMENT_EVENT_UNCORRELATED_LABEL = "Não correlacionado";

/** Label shown when more than one user matches the same Stripe object id. */
export const PAYMENT_EVENT_AMBIGUOUS_LABEL = "Correlação ambígua (mais de um usuário)";

/** Mask Stripe object IDs for safe admin display (cus_/sub_/pi_/evt_). */
export function maskStripeId(id: string | null | undefined): string | null {
  if (!id?.trim()) return null;
  const value = id.trim();
  const prefixMatch = value.match(/^(cus_|sub_|pi_|evt_|cs_|in_)/);
  const prefix = prefixMatch?.[1] ?? "";
  const rest = value.slice(prefix.length);
  if (rest.length <= 6) return `${prefix}${rest}`;
  return `${prefix}${rest.slice(0, 4)}…${rest.slice(-2)}`;
}
