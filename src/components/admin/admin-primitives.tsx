import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  EXTERNAL_LINK_REL,
  EXTERNAL_LINK_TARGET,
} from "@/lib/admin/stripe-dashboard-links";

export type AdminDataQuality = "parcial" | "estimada" | "indisponivel";

const QUALITY_LABEL: Record<AdminDataQuality, string> = {
  parcial: "PARCIAL",
  estimada: "ESTIMADA",
  indisponivel: "INDISPONÍVEL",
};

export function AdminDataQualityBadge({
  quality,
  className,
}: {
  quality: AdminDataQuality;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        quality === "parcial" &&
          "border-amber-700/50 bg-amber-50 text-amber-950",
        quality === "estimada" &&
          "border-gold/50 bg-gold/10 text-ink",
        quality === "indisponivel" &&
          "border-border bg-sand-100 text-ink-soft",
        className,
      )}
    >
      {QUALITY_LABEL[quality]}
    </span>
  );
}

export function AdminSection({
  title,
  description,
  labelledBy,
  children,
  className,
  tone = "default",
}: {
  title?: string;
  description?: string;
  labelledBy?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "priority" | "muted";
}) {
  const headingId = title
    ? `admin-section-${title.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}`
    : undefined;

  return (
    <section
      className={cn(
        "space-y-3",
        tone === "priority" &&
          "rounded-2xl border border-wine/25 bg-gradient-to-br from-wine/[0.04] to-transparent p-4 sm:p-5",
        tone === "muted" &&
          "rounded-2xl border border-border/50 bg-sand-50/40 p-4 sm:p-5",
        className,
      )}
      aria-labelledby={title ? headingId : labelledBy}
    >
      {title ? (
        <div className="max-w-3xl">
          <h2 id={headingId} className="font-display text-xl text-ink">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminPillarBlock({
  eyebrow,
  title,
  limitation,
  href,
  hrefLabel,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  limitation?: string;
  href: string;
  hrefLabel: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[0_1px_0_rgba(44,36,28,0.04)] sm:p-5",
        className,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
        {eyebrow}
      </p>
      <h3 className="mt-1.5 font-display text-lg text-ink">{title}</h3>
      {children ? <div className="mt-3 flex-1">{children}</div> : null}
      {limitation ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">{limitation}</p>
      ) : null}
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {hrefLabel}
      </Link>
    </section>
  );
}

export function AdminKpi({
  label,
  value,
  hint,
  href,
  partial = false,
  estimated = false,
  unavailable = false,
  compact = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  partial?: boolean;
  estimated?: boolean;
  unavailable?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const quality: AdminDataQuality | null = unavailable
    ? "indisponivel"
    : estimated
      ? "estimada"
      : partial
        ? "parcial"
        : null;

  const displayValue =
    quality && quality !== "indisponivel"
      ? `${value} · ${QUALITY_LABEL[quality]}`
      : value;

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] uppercase tracking-wide text-ink-soft">
          {label}
        </p>
        {quality ? <AdminDataQualityBadge quality={quality} /> : null}
      </div>
      <p
        className={cn(
          "mt-1.5 break-words font-display text-ink",
          compact ? "text-xl" : "text-2xl",
        )}
      >
        {displayValue}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </>
  );

  const shell = cn(
    "block min-w-0 rounded-xl border border-border/70 bg-card/60 transition",
    compact ? "px-3 py-2.5" : "p-4",
    href &&
      "hover:border-ink/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }

  return <div className={shell}>{body}</div>;
}

export function AdminAlertItem({
  level,
  title,
  context,
  period,
  actionLabel,
  href,
  source,
}: {
  level: "critical" | "attention" | "info" | "unavailable";
  title: string;
  context: string;
  period?: string;
  actionLabel: string;
  href: string;
  source?: string;
}) {
  const levelLabel =
    level === "critical"
      ? "Crítico"
      : level === "attention"
        ? "Atenção"
        : level === "unavailable"
          ? "Indisponível"
          : "Informativo";

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex min-h-11 flex-col gap-1.5 rounded-xl border px-3 py-3 text-sm transition sm:flex-row sm:items-start sm:justify-between",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          level === "critical" &&
            "border-red-700/40 bg-red-50 text-red-950 hover:bg-red-50/80",
          level === "attention" &&
            "border-amber-700/40 bg-amber-50 text-amber-950 hover:bg-amber-50/80",
          level === "info" &&
            "border-border/70 bg-sand-50 text-ink hover:bg-sand-100/80",
          level === "unavailable" &&
            "border-border/70 bg-sand-100/80 text-ink-soft hover:bg-sand-100",
        )}
      >
        <span className="min-w-0">
          <span className="inline-flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                level === "critical" &&
                  "border-red-800/40 bg-red-100 text-red-950",
                level === "attention" &&
                  "border-amber-800/40 bg-amber-100 text-amber-950",
                level === "info" && "border-border bg-card text-ink",
                level === "unavailable" &&
                  "border-border bg-sand-50 text-ink-soft",
              )}
            >
              {levelLabel}
            </span>
            <span className="font-medium">{title}</span>
          </span>
          <span className="mt-1 block text-xs opacity-90">{context}</span>
          {period || source ? (
            <span className="mt-1 block text-[11px] opacity-80">
              {[period, source].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs font-medium underline underline-offset-2">
          {actionLabel}
        </span>
      </Link>
    </li>
  );
}

export function AdminQueueItem({
  name,
  count,
  urgency,
  explanation,
  href,
  emphasize = false,
}: {
  name: string;
  count?: string | number | null;
  urgency: "critical" | "high" | "medium" | "low";
  explanation: string;
  href: string;
  emphasize?: boolean;
}) {
  const urgencyLabel =
    urgency === "critical"
      ? "Crítica"
      : urgency === "high"
        ? "Alta"
        : urgency === "medium"
          ? "Média"
          : "Rotina";

  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-11 flex-col gap-2 rounded-xl border px-3 py-3 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        emphasize
          ? "border-wine/30 bg-card shadow-[0_1px_0_rgba(44,36,28,0.06)] sm:col-span-2"
          : "border-border/70 bg-card/50 hover:bg-sand-50/80",
        urgency === "critical" && "border-red-700/35",
        urgency === "high" && "border-amber-700/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink">{name}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{explanation}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {count != null && count !== "" ? (
            <span className="font-display text-xl text-ink">{count}</span>
          ) : (
            <span className="text-xs text-ink-soft">Abrir</span>
          )}
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              urgency === "critical" &&
                "border-red-800/40 bg-red-50 text-red-950",
              urgency === "high" &&
                "border-amber-800/40 bg-amber-50 text-amber-950",
              urgency === "medium" && "border-border bg-sand-50 text-ink",
              urgency === "low" && "border-border/60 bg-transparent text-ink-soft",
            )}
          >
            {urgencyLabel}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-ink underline underline-offset-2">
        Ver fila
      </span>
    </Link>
  );
}

export function AdminExternalToolLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target={EXTERNAL_LINK_TARGET}
      rel={EXTERNAL_LINK_REL}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-dashed border-border/80 bg-sand-50/60 px-3 py-1.5 text-sm text-ink-soft transition hover:border-gold/50 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
    >
      <span aria-hidden="true" className="text-[10px] uppercase tracking-wide text-gold">
        Ext
      </span>
      {children}
    </a>
  );
}

export function AdminEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  tone = "empty",
  className,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  tone?: "empty" | "filtered" | "unavailable" | "partial" | "error";
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-2xl border px-4 py-6 text-center sm:px-6",
        tone === "empty" && "border-dashed border-border/80 bg-sand-50/50",
        tone === "filtered" && "border-border/70 bg-card/50",
        tone === "unavailable" && "border-border/70 bg-sand-100/70",
        tone === "partial" && "border-amber-700/30 bg-amber-50/60",
        tone === "error" && "border-destructive/30 bg-destructive/5",
        className,
      )}
    >
      <p
        className={cn(
          "font-display text-lg",
          tone === "error" ? "text-destructive" : "text-ink",
        )}
      >
        {title}
      </p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-soft">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-ink hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function AdminFilterSummary({
  items,
  clearHref,
  resultCount,
  partial,
  className,
}: {
  items: { label: string; value: string }[];
  clearHref?: string;
  resultCount?: number;
  partial?: boolean;
  className?: string;
}) {
  if (items.length === 0 && resultCount == null) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-sand-50/70 px-3 py-2.5 text-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {resultCount != null ? (
        <span className="font-medium text-ink">
          {resultCount} resultado{resultCount === 1 ? "" : "s"}
          {partial ? " · PARCIAL" : ""}
        </span>
      ) : null}
      {items.map((item) => (
        <span
          key={`${item.label}:${item.value}`}
          className="rounded-md border border-border/70 bg-card px-2 py-1 text-xs text-ink"
        >
          <span className="text-ink-soft">{item.label}: </span>
          {item.value}
        </span>
      ))}
      {clearHref ? (
        <Link
          href={clearHref}
          className="ml-auto inline-flex min-h-11 items-center text-xs font-medium text-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Limpar filtros
        </Link>
      ) : null}
    </div>
  );
}

export function AdminOpLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-sm text-ink hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </Link>
  );
}
