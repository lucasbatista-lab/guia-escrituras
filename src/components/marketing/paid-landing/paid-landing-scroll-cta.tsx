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

/**
 * Plan-neutral fixed CTA — scrolls to #planos without selecting a plan.
 */
export function PaidLandingFixedCta({
  visible,
}: {
  visible: boolean;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-sand-50/95 px-3 pb-[max(0.2rem,var(--safe-bottom))] pt-0.5 backdrop-blur-md transition-transform duration-200 md:hidden",
        visible ? "translate-y-0" : "translate-y-full pointer-events-none",
      )}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] leading-none text-ink">
          <span className="min-[360px]:hidden">A partir de R$38/mês</span>
          <span className="hidden min-[360px]:inline">
            Planos a partir de R$38/mês
          </span>
        </p>
        <a
          href="#planos"
          tabIndex={visible ? 0 : -1}
          aria-label="Escolher meu plano — planos a partir de R$38 por mês"
          className="inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-md bg-wine px-3.5 text-sm font-medium text-sand-50 transition hover:bg-wine-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => {
            trackPublicConversion("paid_landing_primary_cta_clicked");
          }}
        >
          Escolher meu plano
        </a>
      </div>
    </div>
  );
}
