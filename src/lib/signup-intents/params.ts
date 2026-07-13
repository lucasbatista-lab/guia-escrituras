import type { PlanKey } from "@/lib/entitlements";
import { getPlanByKey } from "@/lib/entitlements";
import type { SignupTrackingParams } from "./types";

const CHECKOUT_PLAN_KEYS: PlanKey[] = ["essencial", "caminho", "profundo"];

const UTM_MAX = 120;
const REF_MAX = 64;

function sanitizeText(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function isCheckoutPlanKey(planKey: string): planKey is PlanKey {
  return CHECKOUT_PLAN_KEYS.includes(planKey as PlanKey);
}

export function validateCheckoutPlan(planKey: string | null | undefined): {
  ok: true;
  planKey: PlanKey;
} | {
  ok: false;
  code: "invalid_plan" | "request_access_plan";
} {
  if (!planKey?.trim()) {
    return { ok: false, code: "invalid_plan" };
  }
  const normalized = planKey.trim().toLowerCase();
  const plan = getPlanByKey(normalized as PlanKey);
  if (!plan) {
    return { ok: false, code: "invalid_plan" };
  }
  if (plan.ctaType === "request_access") {
    return { ok: false, code: "request_access_plan" };
  }
  if (!isCheckoutPlanKey(normalized)) {
    return { ok: false, code: "invalid_plan" };
  }
  return { ok: true, planKey: normalized };
}

export function parseSignupSearchParams(
  params: Record<string, string | string[] | undefined>,
): {
  planKey: string | null;
  tracking: SignupTrackingParams;
} {
  const get = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  return {
    planKey: get("plan")?.trim().toLowerCase() ?? null,
    tracking: {
      referralCode: sanitizeText(get("ref"), REF_MAX),
      utmSource: sanitizeText(get("utm_source"), UTM_MAX),
      utmMedium: sanitizeText(get("utm_medium"), UTM_MAX),
      utmCampaign: sanitizeText(get("utm_campaign"), UTM_MAX),
      utmContent: sanitizeText(get("utm_content"), UTM_MAX),
      utmTerm: sanitizeText(get("utm_term"), UTM_MAX),
    },
  };
}

export function buildCadastroHref(
  planKey: PlanKey,
  tracking?: SignupTrackingParams,
): string {
  const search = new URLSearchParams({ plan: planKey });
  if (tracking?.referralCode) search.set("ref", tracking.referralCode);
  if (tracking?.utmSource) search.set("utm_source", tracking.utmSource);
  if (tracking?.utmMedium) search.set("utm_medium", tracking.utmMedium);
  if (tracking?.utmCampaign) search.set("utm_campaign", tracking.utmCampaign);
  if (tracking?.utmContent) search.set("utm_content", tracking.utmContent);
  if (tracking?.utmTerm) search.set("utm_term", tracking.utmTerm);
  return `/cadastro?${search.toString()}`;
}
