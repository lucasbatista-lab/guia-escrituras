"use client";

import { trackPublicConversion } from "@/lib/acquisition/public-events-client";
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

export function PaidLandingFixedCta({
  visible,
}: {
  visible: boolean;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-sand-50/95 px-4 pb-[max(0.75rem,var(--safe-bottom))] pt-3 backdrop-blur-md transition-transform duration-200 md:hidden",
        visible ? "translate-y-0" : "translate-y-full pointer-events-none",
      )}
      aria-hidden={!visible}
    >
      <PaidLandingScrollCta
        href="#planos"
        event="paid_landing_primary_cta_clicked"
        className="flex min-h-12 w-full items-center justify-center rounded-md bg-wine px-4 text-sm font-medium text-sand-50 transition hover:bg-wine-soft"
      >
        Começar agora
      </PaidLandingScrollCta>
    </div>
  );
}
