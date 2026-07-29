"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";
import type { PlanKey } from "@/lib/entitlements";
import type { PublicConversionEventName } from "@/lib/acquisition/public-event-types";
import { trackPublicConversion } from "@/lib/acquisition/public-events-client";
import { withTrackingParams } from "@/lib/navigation/tracking-href";

type TrackingLinkProps = ComponentProps<typeof Link> & {
  href: string;
  conversionEvent?: PublicConversionEventName;
  conversionPlan?: PlanKey | null;
};

function TrackingLinkInner({
  href,
  conversionEvent,
  conversionPlan = null,
  onClick,
  ...rest
}: TrackingLinkProps) {
  const searchParams = useSearchParams();
  const tracking = {
    ref: searchParams.get("ref"),
    utm_source: searchParams.get("utm_source"),
    utm_medium: searchParams.get("utm_medium"),
    utm_campaign: searchParams.get("utm_campaign"),
    utm_content: searchParams.get("utm_content"),
    utm_term: searchParams.get("utm_term"),
  };
  return (
    <Link
      href={withTrackingParams(href, tracking)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && conversionEvent) {
          trackPublicConversion(conversionEvent, conversionPlan);
        }
      }}
      {...rest}
    />
  );
}

/** Link that preserves UTM/ref query params across marketing funnel. */
export function TrackingLink(props: TrackingLinkProps) {
  const {
    conversionEvent: _conversionEvent,
    conversionPlan: _conversionPlan,
    ...linkProps
  } = props;
  return (
    <Suspense fallback={<Link {...linkProps} />}>
      <TrackingLinkInner {...props} />
    </Suspense>
  );
}
