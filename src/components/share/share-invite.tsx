"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  SHARE_COPIED_FEEDBACK,
  SHARE_TEXT,
  SHARE_TITLE,
  buildShareMessage,
  buildWhatsAppShareHref,
  copyTextToClipboard,
  isUserShareCancellation,
} from "@/lib/share";
import { cn } from "@/lib/utils";

const COPY_FEEDBACK_MS = 2500;

export type ShareInviteProps = {
  /** Absolute home URL with validated UTM (+ optional ref). Never pass HTML. */
  shareUrl: string;
  className?: string;
  /** compact = home final CTA (less chrome) */
  variant?: "default" | "compact";
};

function subscribeNoop() {
  return () => undefined;
}

function getNativeShareSnapshot() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  );
}

function getNativeShareServerSnapshot() {
  return false;
}

function canUseNativeShare(): boolean {
  return getNativeShareSnapshot();
}

/**
 * Organic share actions: native share, WhatsApp, copy link.
 * Never reads conversation content. shareUrl is treated as plain text only.
 */
export function ShareInvite({
  shareUrl,
  className,
  variant = "default",
}: ShareInviteProps) {
  const feedbackId = useId();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [fallbackHint, setFallbackHint] = useState(false);
  const nativeAvailable = useSyncExternalStore(
    subscribeNoop,
    getNativeShareSnapshot,
    getNativeShareServerSnapshot,
  );

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function handlePrimaryShare() {
    setShareError(false);
    setFallbackHint(false);

    if (!canUseNativeShare()) {
      setFallbackHint(true);
      return;
    }

    try {
      await navigator.share({
        title: SHARE_TITLE,
        text: SHARE_TEXT,
        url: shareUrl,
      });
    } catch (error) {
      if (isUserShareCancellation(error)) return;
      setShareError(true);
      setFallbackHint(true);
    }
  }

  async function handleCopy() {
    setCopyFailed(false);
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      return;
    }
    setCopyFailed(true);
  }

  const whatsappHref = buildWhatsAppShareHref(shareUrl);
  const messagePreview = buildShareMessage(shareUrl);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "flex flex-col gap-2",
          variant === "default" ? "sm:flex-row sm:flex-wrap" : "",
        )}
      >
        <Button
          type="button"
          className="min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto"
          onClick={() => void handlePrimaryShare()}
        >
          Compartilhar o Amém Chat
        </Button>

        <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </Button>

        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          onClick={() => void handleCopy()}
        >
          Copiar link
        </Button>
      </div>

      {!nativeAvailable || fallbackHint ? (
        <p className="text-xs text-ink-soft">
          Use WhatsApp ou copie o link para enviar o Amém Chat.
        </p>
      ) : null}

      <p
        id={feedbackId}
        className="min-h-5 text-sm text-ink-soft"
        aria-live="polite"
        role="status"
      >
        {copied
          ? SHARE_COPIED_FEEDBACK
          : copyFailed
            ? "Não foi possível copiar. Selecione o link abaixo."
            : shareError
              ? "Não foi possível abrir o compartilhamento. Use WhatsApp ou copie o link."
              : null}
      </p>

      <p className="break-all text-xs text-ink-soft">
        <span className="sr-only">Link para compartilhar: </span>
        <a
          href={shareUrl}
          className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {shareUrl}
        </a>
      </p>

      <span className="sr-only">{messagePreview}</span>
    </div>
  );
}
