import type { PlanKey } from "@/lib/entitlements";

export type CheckoutSuccessNextPath =
  | "/personalizar"
  | "/inicio"
  | "/conversar"
  | "/jornadas";

/**
 * After paid activation: personalize first if needed; otherwise guide to the
 * plan's primary premium surface (Essencial/Profundo → Conversar, Caminho → Caminhos).
 */
export function resolveFirstPremiumPath(
  planKey: PlanKey | null,
  onboardingCompleted: boolean,
): CheckoutSuccessNextPath {
  if (!onboardingCompleted) return "/personalizar";
  if (planKey === "caminho") return "/jornadas";
  if (planKey === "essencial" || planKey === "profundo") return "/conversar";
  return "/inicio";
}
