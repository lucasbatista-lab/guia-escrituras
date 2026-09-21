"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** ≥44px icon control with press settle — for overflow/close/menu affordances. */
export const IconAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(({ className, label, type = "button", children, ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    aria-label={label}
    className={cn(
      "amem-press inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-soft",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-45",
      className,
    )}
    {...props}
  >
    {children}
  </button>
));
IconAction.displayName = "IconAction";
