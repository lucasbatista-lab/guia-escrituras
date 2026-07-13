"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !body.url) {
        setError(body.message ?? "Não foi possível abrir o portal de cobrança.");
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Não foi possível abrir o portal de cobrança.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="bg-ink hover:bg-ink/90"
      >
        {loading ? "Abrindo…" : "Gerenciar assinatura"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
