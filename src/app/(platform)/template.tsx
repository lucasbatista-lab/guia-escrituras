import type { ReactNode } from "react";

/** Light CSS page-enter — no client JS, no SSR/hydration risk. */
export default function PlatformTemplate({ children }: { children: ReactNode }) {
  return <div className="amem-page-enter">{children}</div>;
}
