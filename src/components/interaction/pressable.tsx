"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type PressableProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  /** Visual surface tone for interactive rows/chips (not full CTAs). */
  tone?: "plain" | "soft" | "selected" | "ghost";
};

/**
 * Minimal tactile surface — settle on press, soft return on release.
 * Prefer Button for primary CTAs; use Pressable for chips/rows/icon actions.
 */
export const Pressable = React.forwardRef<HTMLButtonElement, PressableProps>(
  ({ className, asChild = false, tone = "plain", type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(
          "amem-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-45",
          tone === "soft" && "amem-surface-soft px-3.5",
          tone === "selected" && "amem-surface-selected px-3.5",
          tone === "ghost" && "px-3 text-ink-soft",
          tone === "plain" && "px-3",
          className,
        )}
        {...props}
      />
    );
  },
);
Pressable.displayName = "Pressable";
