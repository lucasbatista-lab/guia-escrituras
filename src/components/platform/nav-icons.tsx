import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

/** V15 geometric nav icons — stroke 1.7, round caps, currentColor. */
type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function NavIconBase({
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
      className={cn("size-[22px]", className)}
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

/** Quiet house — Início */
export function NavIconInicio(props: IconProps) {
  return (
    <NavIconBase {...props}>
      <path d="M4.5 11L12 4.5 19.5 11" />
      <path d="M7 10.5V19h10v-8.5" />
      <path d="M10 19v-5h4v5" />
    </NavIconBase>
  );
}

/** Day arc — Hoje */
export function NavIconHoje(props: IconProps) {
  return (
    <NavIconBase {...props}>
      <path d="M5 16c2.2-3.5 5-5.2 7-5.2S16.8 12.5 19 16" />
      <circle cx="12" cy="8.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 10.5V12.2" />
    </NavIconBase>
  );
}

/** Overlapped leaves — Espaço */
export function NavIconEspaco(props: IconProps) {
  return (
    <NavIconBase {...props}>
      <rect x="4" y="5" width="11" height="11" rx="2.5" />
      <path d="M9 16.5V18a2.5 2.5 0 0 0 2.5 2.5H18A2.5 2.5 0 0 0 20.5 18v-6.5A2.5 2.5 0 0 0 18 9h-1.5" />
    </NavIconBase>
  );
}

/** Dialogue arcs — Conversar */
export function NavIconConversar(props: IconProps) {
  return (
    <NavIconBase {...props}>
      <path d="M5 8.2c0-2.1 1.9-3.7 4.3-3.7h2.2" />
      <path d="M19 15.8c0 2.1-1.9 3.7-4.3 3.7h-2.2" />
      <circle cx="8.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </NavIconBase>
  );
}

/** Path nodes (not network/automation) — Caminhos */
export function NavIconCaminhos(props: IconProps) {
  return (
    <NavIconBase {...props}>
      <circle cx="6" cy="16" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="14" r="1.6" fill="currentColor" stroke="none" />
      <path d="M7.4 14.8c1.4-2.2 2.8-4.6 4-5.6 1.4 1.2 3.2 3.6 4.8 5" />
    </NavIconBase>
  );
}

/** Descending lines — Menu */
export function NavIconMenu(props: IconProps) {
  return (
    <NavIconBase {...props}>
      <path d="M6 8h12M6 12h9M6 16h6" />
    </NavIconBase>
  );
}
