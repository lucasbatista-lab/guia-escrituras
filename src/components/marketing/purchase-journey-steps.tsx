import { ProgressSteps } from "@/components/platform/progress-steps";

export type PurchaseJourneyStepKey =
  | "plano"
  | "conta"
  | "pagamento"
  | "personalizacao"
  | "reflexao";

const ORDER: PurchaseJourneyStepKey[] = [
  "plano",
  "conta",
  "pagamento",
  "personalizacao",
  "reflexao",
];

const LABELS: Record<PurchaseJourneyStepKey, string> = {
  plano: "Plano",
  conta: "Conta",
  pagamento: "Pagamento",
  personalizacao: "Personalização",
  reflexao: "Primeira reflexão",
};

export function PurchaseJourneySteps({
  current,
  className,
}: {
  current: PurchaseJourneyStepKey;
  className?: string;
}) {
  const currentIdx = ORDER.indexOf(current);
  const steps = ORDER.map((key, index) => ({
    label: LABELS[key],
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
