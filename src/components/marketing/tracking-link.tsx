"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";
import { withTrackingParams } from "@/lib/navigation/tracking-href";

function TrackingLinkInner({
  href,
  ...rest
}: ComponentProps<typeof Link> & { href: string }) {
  const searchParams = useSearchParams();
  const tracking = {
    ref: searchParams.get("ref"),
    utm_source: searchParams.get("utm_source"),
    utm_medium: searchParams.get("utm_medium"),
    utm_campaign: searchParams.get("utm_campaign"),
    utm_content: searchParams.get("utm_content"),
    utm_term: searchParams.get("utm_term"),
  };
  return <Link href={withTrackingParams(href, tracking)} {...rest} />;
}

/** Link that preserves UTM/ref query params across marketing funnel. */
export function TrackingLink(props: ComponentProps<typeof Link> & { href: string }) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <TrackingLinkInner {...props} />
    </Suspense>
  );
}
