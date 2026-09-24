import { SoftPaywallSheet } from "@/components/commerce/soft-paywall-sheet";
import {
  getSoftPaywallCopy,
  softPaywallViewerFromPlanKey,
  type SoftPaywallResourceId,
  type SoftPaywallViewer,
} from "@/lib/commerce/soft-paywall";
import type { PlanKey } from "@/lib/entitlements";

/** Server-friendly gate: teaser + SoftPaywallSheet for FREE/lapsed users. */
export function SoftPaywallGate({
  resource,
  planKey = null,
  viewer,
}: {
  resource: SoftPaywallResourceId;
  /** Current account plan when known — avoids “conta grátis” copy for paid. */
  planKey?: PlanKey | null;
  viewer?: SoftPaywallViewer;
}) {
  const resolved = viewer ?? softPaywallViewerFromPlanKey(planKey);
  const copy = getSoftPaywallCopy(resource, resolved);
  return <SoftPaywallSheet copy={copy} defaultOpen />;
}
