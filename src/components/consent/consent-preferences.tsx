"use client";

import { useState } from "react";
import { CONSENT_COPY, CONSENT_POLICY_VERSION } from "@/lib/consent";
import { useConsent } from "./consent-context";

export function ConsentPreferencesPanel({ titleId }: { titleId: string }) {
  const {
    record,
    saveAdvertisingPreference,
    closePreferences,
    refuseAdvertising,
  } = useConsent();
  const [advertising, setAdvertising] = useState(
    record?.advertising === "granted",
  );

  return (
    <div>
      <h2 id={titleId} className="font-display text-lg text-ink">
        Preferências de cookies
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Necessários ficam sempre ativos. Publicidade só com a sua autorização.
        Versão da preferência: {CONSENT_POLICY_VERSION}.
      </p>

      <fieldset className="mt-4 space-y-3">
        <legend className="sr-only">Categorias</legend>
        <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-3">
          <input
            type="checkbox"
            checked
            disabled
            className="mt-1 size-4"
            aria-describedby="consent-necessary-help"
          />
          <span>
            <span className="block text-sm font-medium text-ink">
              Necessários
            </span>
            <span
              id="consent-necessary-help"
              className="mt-0.5 block text-xs leading-relaxed text-ink-soft"
            >
              Sessão, segurança e aquisição first-party para o funcionamento do
              serviço. Sempre ativos.
            </span>
          </span>
        </label>

        <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-3">
          <input
            type="checkbox"
            checked={advertising}
            onChange={(event) => setAdvertising(event.target.checked)}
            className="mt-1 size-4"
            aria-describedby="consent-ads-help"
          />
          <span>
            <span className="block text-sm font-medium text-ink">
              Publicidade
            </span>
            <span
              id="consent-ads-help"
              className="mt-0.5 block text-xs leading-relaxed text-ink-soft"
            >
              Meta Pixel, cookies _fbp/_fbc e eventos de mensuração de campanha
              (incluindo identificadores em hash e dados técnicos de conexão no
              checkout). Desativada por padrão.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-sand-50 transition hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => saveAdvertisingPreference(advertising)}
        >
          {CONSENT_COPY.save}
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-ink transition hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={refuseAdvertising}
        >
          {CONSENT_COPY.refuse}
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-ink-soft underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={closePreferences}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

/** Inline control for /cookies and footers — reopens the preference sheet. */
export function ConsentPreferencesTrigger({
  className,
}: {
  className?: string;
}) {
  const { openPreferences } = useConsent();
  return (
    <button
      type="button"
      className={className}
      onClick={openPreferences}
    >
      Alterar preferências de cookies
    </button>
  );
}
