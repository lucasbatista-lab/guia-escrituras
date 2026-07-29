import type { PlanKey } from "@/lib/entitlements";

export const PUBLIC_CONVERSION_EVENTS = [
  "landing_viewed",
  "product_demo_viewed",
  "product_demo_topic_selected",
  "plans_cta_clicked",
  "plan_selected",
  "signup_started",
] as const;

export type PublicConversionEventName =
  (typeof PUBLIC_CONVERSION_EVENTS)[number];

export type ViewportClass = "mobile" | "tablet" | "desktop";

export type PublicConversionEventPayload = {
  event: PublicConversionEventName;
  path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  plan: PlanKey | null;
  viewport_class: ViewportClass;
};
