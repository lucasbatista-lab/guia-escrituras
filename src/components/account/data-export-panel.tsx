"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

function filenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) return null;
  const match = /filename="([^"]+)"/i.exec(header);
  return match?.[1] ?? null;
}

function fallbackFilename(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `amem-chat-meus-dados-${yyyy}-${mm}-${dd}.json`;
}

function errorMessageForStatus(status: number): string {
  if (status === 401) {
    return "Sua sessão expirou. Entre novamente para baixar seus dados.";
  }
  if (status === 403) {
    return "Você não tem permissão para baixar estes dados.";
  }
  if (status === 429) {
    return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  }
  if (status === 413) {
    return "Seus dados são muito volumosos para exportar automaticamente agora. Fale com o suporte.";
  }
  return "Não foi possível preparar o arquivo agora. Tente novamente em instantes.";
}

export function DataExportPanel() {
  const statusId = useId();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function onDownload() {
    if (inFlight.current || pending) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    setStatus(
      "Preparando seus dados. Se houver muitas conversas, isso pode demorar um pouco.",
    );

    let objectUrl: string | null = null;
    try {
      const response = await fetch("/api/account/export", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        setError(errorMessageForStatus(response.status));
        setStatus(null);
        return;
      }

      const blob = await response.blob();
      const filename =
        filenameFromContentDisposition(
          response.headers.get("Content-Disposition"),
        ) ?? fallbackFilename();

      objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setStatus("Download iniciado.");
    } catch {
      setError(
        "Não foi possível preparar o arquivo agora. Tente novamente em instantes.",
      );
      setStatus(null);
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setPending(false);
      inFlight.current = false;
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={onDownload}
        disabled={pending}
        aria-busy={pending}
        aria-describedby={statusId}
        aria-label="Baixar meus dados"
      >
        {pending ? "Preparando…" : "Baixar meus dados"}
      </Button>
      <div id={statusId} className="space-y-1" aria-live="polite">
        {status ? <p className="text-sm text-ink-soft">{status}</p> : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
