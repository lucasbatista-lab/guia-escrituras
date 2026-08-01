"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { trackPublicConversion } from "@/lib/acquisition/public-events-client";
import { formatPriceBRL, getPlanByKey } from "@/lib/entitlements";
import { buildCadastroHref } from "@/lib/signup-intents/params";
import { cn } from "@/lib/utils";

type PaidLandingScrollCtaProps = {
  href: "#planos" | "#demonstracao";
  event: "paid_landing_primary_cta_clicked" | "paid_landing_demo_clicked";
  className?: string;
  children: React.ReactNode;
};

export function PaidLandingScrollCta({
  href,
  event,
  className,
  children,
}: PaidLandingScrollCtaProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => {
        trackPublicConversion(event);
      }}
    >
      {children}
    </a>
  );
}

function PaidLandingFixedCtaInner({ visible }: { visible: boolean }) {
  const searchParams = useSearchParams();
  const caminho = getPlanByKey("caminho");
  const tracking = {
    referralCode: searchParams.get("ref"),
    utmSource: searchParams.get("utm_source"),
    utmMedium: searchParams.get("utm_medium"),
    utmCampaign: searchParams.get("utm_campaign"),
    utmContent: searchParams.get("utm_content"),
    utmTerm: searchParams.get("utm_term"),
  };
  const href = buildCadastroHref("caminho", tracking);
  const price = caminho
    ? formatPriceBRL(caminho.priceMonthlyCents)
    : "R$\u00a058";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-sand-50/95 px-3 pb-[max(0.25rem,var(--safe-bottom))] pt-0.5 backdrop-blur-md transition-transform duration-200 md:hidden",
        visible ? "translate-y-0" : "translate-y-full pointer-events-none",
      )}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] leading-none text-ink">
          Caminho · {price}/mês
        </p>
        <TrackingLink
          href={href}
          conversionEvent="paid_landing_plan_selected"
          conversionPlan="caminho"
          tabIndex={visible ? 0 : -1}
          className="inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-md bg-wine px-3.5 text-sm font-medium text-sand-50 transition hover:bg-wine-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Escolher Caminho
        </TrackingLink>
      </div>
    </div>
  );
}

export function PaidLandingFixedCta({
  visible,
}: {
  visible: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <PaidLandingFixedCtaInner visible={visible} />
    </Suspense>
  );
}
