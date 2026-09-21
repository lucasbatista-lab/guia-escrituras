"use client";

import { createElement, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MotionTone = "fast" | "normal" | "ritual";

const TONE_CLASS: Record<MotionTone, string> = {
  fast: "amem-enter-fast",
  normal: "amem-enter-soft",
  ritual: "amem-enter-ritual",
};

/** Soft enter — CSS only; respects prefers-reduced-motion via token collapse. */
export function SoftEnter({
  children,
  tone = "normal",
  className,
  style,
  as = "div",
}: {
  children: ReactNode;
  tone?: MotionTone;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "main" | "span";
}) {
  return createElement(
    as,
    { className: cn(TONE_CLASS[tone], className), style },
    children,
  );
}

/** Remount-keyed soft swap for stage/phase continuity (exit is instant; enter soft). */
export function SoftSwap({
  swapKey,
  children,
  tone = "normal",
  className,
}: {
  swapKey: string | number;
  children: ReactNode;
  tone?: MotionTone;
  className?: string;
}) {
  return (
    <div key={swapKey} className={cn(TONE_CLASS[tone], className)}>
      {children}
    </div>
  );
}
