import type { PlanKey } from "@/lib/entitlements";

export const PUBLIC_CONVERSION_EVENTS = [
  "landing_viewed",
  "product_demo_viewed",
  "product_demo_topic_selected",
  "plans_cta_clicked",
  "plan_selected",
  "signup_started",
  "paid_landing_viewed",
  "paid_landing_primary_cta_clicked",
  "paid_landing_demo_clicked",
  "paid_landing_demo_viewed",
  "paid_landing_plans_viewed",
  "paid_landing_plan_selected",
] as const;

export type PublicConversionEventName =
  (typeof PUBLIC_CONVERSION_EVENTS)[number];

export type ViewportClass = "mobile" | "tablet" | "desktop";

export type PublicConversionEventPayload = {
  event: PublicConversionEventName;
  event_id: string;
  session_key: string;
  path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  /** Accepted for logs only — not persisted. */
  plan: PlanKey | null;
  viewport_class: ViewportClass;
};
