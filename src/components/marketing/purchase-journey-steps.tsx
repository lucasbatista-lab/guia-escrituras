import { ProgressSteps } from "@/components/platform/progress-steps";

export type PurchaseJourneyStepKey =
  | "plano"
  | "conta"
  | "pagamento"
  | "personalizacao"
  | "reflexao";

const FULL_ORDER: PurchaseJourneyStepKey[] = [
  "plano",
  "conta",
  "pagamento",
  "personalizacao",
  "reflexao",
];

const PAID_ORDER: PurchaseJourneyStepKey[] = ["plano", "conta", "pagamento"];

const FULL_LABELS: Record<PurchaseJourneyStepKey, string> = {
  plano: "Plano",
  conta: "Conta",
  pagamento: "Pagamento",
  personalizacao: "Personalização",
  reflexao: "Primeira reflexão",
};

const PAID_LABELS: Record<PurchaseJourneyStepKey, string> = {
  plano: "Plano",
  conta: "Conta",
  pagamento: "Pagamento",
  personalizacao: "Personalização",
  reflexao: "Primeira reflexão",
};

const FREE_ORDER: PurchaseJourneyStepKey[] = [
  "conta",
  "personalizacao",
  "reflexao",
];

const FREE_LABELS: Record<PurchaseJourneyStepKey, string> = {
  plano: "Plano",
  conta: "Conta",
  pagamento: "Pagamento",
  personalizacao: "Confirmar e-mail",
  reflexao: "Hoje com Deus",
};

export function PurchaseJourneySteps({
  current,
  className,
  variant = "full",
}: {
  current: PurchaseJourneyStepKey;
  className?: string;
  /** Paid: Plano → Conta → Pagamento. Free: Conta → Confirmar e-mail → Hoje. */
  variant?: "full" | "paid" | "free";
}) {
  const order =
    variant === "paid"
      ? PAID_ORDER
      : variant === "free"
        ? FREE_ORDER
        : FULL_ORDER;
  const labels =
    variant === "paid"
      ? PAID_LABELS
      : variant === "free"
        ? FREE_LABELS
        : FULL_LABELS;
  const currentIdx = order.indexOf(current);
  const steps = order.map((key, index) => ({
    label: labels[key],
    status:
      index < currentIdx
        ? ("done" as const)
        : index === currentIdx
          ? ("current" as const)
          : ("upcoming" as const),
  }));

  return (
    <ProgressSteps
      steps={steps}
      label="Sua jornada"
      className={className}
    />
  );
}
