"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  downloadPresenceShareCard,
  sharePresenceShareCard,
  type PresenceShareCardPayload,
  type PresenceShareFormat,
} from "@/lib/share/export-presence-card";
import { cn } from "@/lib/utils";

export function SharePresenceActions({
  payload,
  shareUrl,
  shareText,
  className,
  formats = ["story", "square"],
}: {
  payload: PresenceShareCardPayload;
  shareUrl?: string;
  shareText?: string;
  className?: string;
  formats?: PresenceShareFormat[];
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onShare(format: PresenceShareFormat) {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await sharePresenceShareCard({
        payload,
        format,
        shareUrl,
        title: "Amém · Presença",
        text: shareText,
      });
      if (result === "shared") setStatus("Compartilhado.");
      else if (result === "downloaded")
        setStatus("Cartão salvo. O app shell não entra no arquivo.");
      // cancelled → silent
    } catch {
      setStatus("Não foi possível exportar o cartão agora.");
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(format: PresenceShareFormat) {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      await downloadPresenceShareCard(
        payload,
        format,
        `amem-presenca-${format}.png`,
      );
      setStatus("Cartão baixado (sem header/nav).");
    } catch {
      setStatus("Não foi possível baixar o cartão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {formats.includes("story") ? (
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy}
            onClick={() => void onShare("story")}
          >
            Compartilhar cartão (9:16)
          </Button>
        ) : null}
        {formats.includes("square") ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy}
            onClick={() => void onDownload("square")}
          >
            Baixar quadrado (1:1)
          </Button>
        ) : null}
      </div>
      <p className="min-h-5 text-sm text-ink-soft" aria-live="polite" role="status">
        {status}
      </p>
    </div>
  );
}
