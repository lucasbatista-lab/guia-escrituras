import "server-only";

/**
 * Minimal ops kill switches (MAE-P2-07 / UG-05).
 *
 * Server-only env — no NEXT_PUBLIC. Changing Vercel env typically requires
 * redeploy/restart for serverless to pick up new values.
 *
 * Semantics:
 * - unset / empty → feature enabled (current default)
 * - true / 1 / yes / on → feature disabled
 * - false / 0 / off / no → feature enabled
 * - any other non-empty value → disabled (fail-closed for kill intent)
 */

export type KillSwitchFeature = "chat" | "journeys" | "deepen";

export const KILL_SWITCH_ENV_KEYS = {
  chat: "FEATURE_DISABLE_CHAT",
  journeys: "FEATURE_DISABLE_JOURNEYS",
  deepen: "FEATURE_DISABLE_DEEPEN",
} as const;

export function isFeatureDisabled(
  feature: KillSwitchFeature,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env[KILL_SWITCH_ENV_KEYS[feature]];
  if (raw == null || raw.trim() === "") return false;
  const v = raw.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "off" || v === "no") return false;
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  return true;
}

export const FEATURE_TEMPORARILY_DISABLED_CODE =
  "feature_temporarily_disabled" as const;

export function featureDisabledUserMessage(
  feature: KillSwitchFeature,
): string {
  switch (feature) {
    case "chat":
      return "O chat está temporariamente indisponível por manutenção operacional. Seu histórico e a ajuda continuam acessíveis — tente novamente em breve.";
    case "journeys":
      return "As Jornadas estão temporariamente indisponíveis por manutenção operacional. Seu progresso salvo permanece — tente novamente em breve.";
    case "deepen":
      return "Aprofundar está temporariamente indisponível. Você pode continuar com respostas padrão do chat.";
  }
}
