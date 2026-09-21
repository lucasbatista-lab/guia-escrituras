import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Grouped content with type hierarchy — prefer whitespace over card soup. */
export function AppSection({
  eyebrow,
  title,
  children,
  className,
  id,
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("amem-app-section space-y-3", className)}>
      {eyebrow ? (
        <p className="amem-type-context">{eyebrow}</p>
      ) : null}
      {title ? <h2 className="amem-type-moment">{title}</h2> : null}
      <div className="amem-type-body">{children}</div>
    </section>
  );
}
