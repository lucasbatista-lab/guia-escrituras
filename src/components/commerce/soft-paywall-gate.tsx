import { SoftPaywallSheet } from "@/components/commerce/soft-paywall-sheet";
import {
  getSoftPaywallCopy,
  type SoftPaywallResourceId,
} from "@/lib/commerce/soft-paywall";

/** Server-friendly gate: teaser + SoftPaywallSheet for FREE/lapsed users. */
export function SoftPaywallGate({
  resource,
}: {
  resource: SoftPaywallResourceId;
}) {
  const copy = getSoftPaywallCopy(resource);
  return <SoftPaywallSheet copy={copy} defaultOpen />;
}
