"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Moves keyboard focus to the page title after navigation (success/error screens). */
export function FocusPageTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className={cn("outline-none", className)}
    >
      {children}
    </h1>
  );
}
