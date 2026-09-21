"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function listFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

type ScrollLockSnapshot = {
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  htmlOverflow: string;
  scrollY: number;
};

/**
 * Bottom sheet for private Espaço create/detail — Escape, focus trap, 44px targets.
 * Not SoftPaywall; no commerce chrome.
 */
export function IntimateSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  const dismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open && !wasOpen.current) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
    }
    if (wasOpen.current && !open) {
      const target = restoreFocusRef.current;
      if (target && document.contains(target)) target.focus();
      restoreFocusRef.current = null;
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const scrollY = window.scrollY;
    const snapshot: ScrollLockSnapshot = {
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      htmlOverflow: document.documentElement.style.overflow,
      scrollY,
    };
    document.body.dataset.amemSheet = "open";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    requestAnimationFrame(() => {
      const focusables = listFocusable(sheet);
      const preferred =
        focusables.find((el) => el.tagName === "TEXTAREA" || el.tagName === "INPUT") ??
        focusables[0];
      (preferred ?? sheet)?.focus();
    });

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !sheet) return;
      const focusables = listFocusable(sheet);
      if (focusables.length === 0) {
        event.preventDefault();
        sheet.focus();
        return;
      }
      const firstEl = focusables[0]!;
      const lastEl = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === firstEl || !sheet.contains(active)) {
          event.preventDefault();
          lastEl.focus();
        }
        return;
      }
      if (active === lastEl || !sheet.contains(active)) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      delete document.body.dataset.amemSheet;
      document.documentElement.style.overflow = snapshot.htmlOverflow;
      document.body.style.overflow = snapshot.bodyOverflow;
      document.body.style.position = snapshot.bodyPosition;
      document.body.style.top = snapshot.bodyTop;
      document.body.style.width = snapshot.bodyWidth;
      window.scrollTo(0, snapshot.scrollY);
    };
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[100] cursor-default border-0 p-0 backdrop-blur-[4px]"
        style={{ background: "rgba(247,245,241,0.5)" }}
        aria-label="Fechar"
        tabIndex={-1}
        onClick={dismiss}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[110] mx-auto max-w-lg outline-none",
          className,
        )}
      >
        <div
          className="max-h-[min(88vh,720px)] overflow-y-auto rounded-t-[28px] bg-[color:var(--amem-surface,#FFFDFC)] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-18px_48px_rgba(25,22,19,0.14)]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id={titleId} className="font-display text-xl text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fechar"
            >
              <span aria-hidden className="text-lg">
                ×
              </span>
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
