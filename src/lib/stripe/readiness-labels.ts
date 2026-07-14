import type { StripeKeyMode } from "./key-mode";

const PLAN_LABELS: Record<string, string> = {
  essencial: "Essencial",
  caminho: "Caminho",
  profundo: "Profundo",
};

const ISSUE_LABELS: Record<string, string> = {
  secret_key_invalid_or_missing: "Chave secreta da Stripe ausente ou inválida.",
  secret_key_unavailable: "Não foi possível ler a chave secreta da Stripe.",
  webhook_secret_missing: "Segredo do webhook não configurado.",
  price_id_missing: "ID do preço não configurado.",
  price_not_found_in_mode: "Preço não encontrado neste ambiente da Stripe.",
  price_inactive: "Preço inativo na Stripe.",
  currency_not_brl: "Moeda do preço não é BRL.",
  not_monthly_recurring: "Preço não é assinatura mensal.",
  unit_amount_mismatch: "Valor do preço difere do catálogo interno.",
  price_lookup_failed: "Falha ao consultar o preço na Stripe.",
};

export function stripeModeLabelPt(mode: StripeKeyMode): string {
  return mode === "live" ? "Produção real" : "Testes";
}

export function translateStripeReadinessIssue(issue: string): string {
  const sep = issue.indexOf(": ");
  if (sep === -1) {
    return ISSUE_LABELS[issue] ?? "Problema de configuração da Stripe.";
  }
  const planKey = issue.slice(0, sep);
  const code = issue.slice(sep + 2);
  const plan = PLAN_LABELS[planKey] ?? planKey;
  const detail = ISSUE_LABELS[code] ?? "Problema de configuração do preço.";
  return `${plan}: ${detail}`;
}

export function stripeOverallStatusPt(ready: boolean): string {
  return ready
    ? "Pronto para cobranças reais"
    : "Configuração incompleta";
}

export function stripePlanReadyLabelPt(ready: boolean): string {
  return ready ? "Pronto" : "Com problema";
}
