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

const PAID_ORDER: PurchaseJourneyStepKey[] = ["plano", "pagamento", "conta"];

const FULL_LABELS: Record<PurchaseJourneyStepKey, string> = {
  plano: "Plano",
  conta: "Conta",
  pagamento: "Pagamento",
  personalizacao: "Personalização",
  reflexao: "Primeira reflexão",
};

const PAID_LABELS: Record<PurchaseJourneyStepKey, string> = {
  plano: "Plano",
  conta: "Começar",
  pagamento: "Pagamento",
  personalizacao: "Personalização",
  reflexao: "Primeira reflexão",
};

export function PurchaseJourneySteps({
  current,
  className,
  variant = "full",
}: {
  current: PurchaseJourneyStepKey;
  className?: string;
  /** Paid funnel: Plano → Pagamento → Começar (3 steps). */
  variant?: "full" | "paid";
}) {
  const order = variant === "paid" ? PAID_ORDER : FULL_ORDER;
  const labels = variant === "paid" ? PAID_LABELS : FULL_LABELS;
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
