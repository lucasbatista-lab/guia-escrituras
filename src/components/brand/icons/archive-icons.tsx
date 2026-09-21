import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function IconBase({
  className,
  title,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={cn("size-5", className)}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <g
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}

/** Open hands / folded leaf — oração */
export function IconPrayer(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 19c-2.2 0-4-1.6-4-3.6V9.5C4 7.5 5.8 6 8 6c1.2 0 2.2.4 2.9 1.1" />
      <path d="M16 19c2.2 0 4-1.6 4-3.6V9.5C20 7.5 18.2 6 16 6c-1.2 0-2.2.4-2.9 1.1" />
      <path d="M12 8.5v7.2" />
      <path d="M10.2 11.2h3.6" />
    </IconBase>
  );
}

/** Lined page — diário */
export function IconJournal(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 8.5h6M9 12h6M9 15.5h4" />
    </IconBase>
  );
}

/** Bookmark corner — salvos */
export function IconSaved(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 5.5h10v14l-5-3.2L7 19.5v-14z" />
    </IconBase>
  );
}

/** Path nodes — resume / journey */
export function IconJourney(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="16" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="14" r="1.6" fill="currentColor" stroke="none" />
      <path d="M7.4 14.8c1.4-2.2 2.8-4.6 4-5.6 1.4 1.2 3.2 3.6 4.8 5" />
    </IconBase>
  );
}

/** Plus in soft square — create */
export function IconCreate(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4.5" y="4.5" width="15" height="15" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </IconBase>
  );
}

/** Chevron affordance */
export function IconChevron(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 6.5l6 5.5-6 5.5" />
    </IconBase>
  );
}

/** Share node */
export function IconShare(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M8.1 10.9l7.8-3.8M8.1 13.1l7.8 3.8" />
    </IconBase>
  );
}

/** Overflow ··· */
export function IconOverflow(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </IconBase>
  );
}
