import type { UserJourneyState } from "./journey-state";

/** Mobile bottom-tab plan — morph-ready FREE ↔ PAID (V11). */
export type BottomNavPlan = "free" | "paid";

export type BottomNavTabId = "inicio" | "hoje" | "slot3" | "caminhos";

export interface BottomNavTab {
  id: BottomNavTabId;
  href: string;
  label: string;
}

/**
 * FREE: Início · Hoje · Espaço · Caminhos · Menu
 * PAID: Início · Hoje · Conversar · Caminhos · Menu
 * Slot 3 morphs Espaço ↔ Conversar; Espaço remains reachable via /inicio + Menu when paid.
 */
export const BOTTOM_NAV_FREE: readonly BottomNavTab[] = [
  { id: "inicio", href: "/inicio", label: "Início" },
  { id: "hoje", href: "/hoje", label: "Hoje" },
  { id: "slot3", href: "/espaco", label: "Espaço" },
  { id: "caminhos", href: "/jornadas", label: "Caminhos" },
] as const;

export const BOTTOM_NAV_PAID: readonly BottomNavTab[] = [
  { id: "inicio", href: "/inicio", label: "Início" },
  { id: "hoje", href: "/hoje", label: "Hoje" },
  { id: "slot3", href: "/conversar", label: "Conversar" },
  { id: "caminhos", href: "/jornadas", label: "Caminhos" },
] as const;

export function getBottomNavPlan(
  state: UserJourneyState,
): BottomNavPlan | null {
  if (
    state === "active_ready" ||
    state === "canceling_at_period_end" ||
    state === "active_needs_personalization"
  ) {
    return "paid";
  }
  if (
    state === "confirmed_without_plan" ||
    state === "ended" ||
    state === "past_due"
  ) {
    return "free";
  }
  return null;
}

export function getBottomNavTabs(plan: BottomNavPlan): readonly BottomNavTab[] {
  return plan === "paid" ? BOTTOM_NAV_PAID : BOTTOM_NAV_FREE;
}

export function isBottomNavTabActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/inicio") {
    return pathname === "/inicio";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
