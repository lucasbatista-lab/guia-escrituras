"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/platform/inline-notice";
import { ProgressSteps } from "@/components/platform/progress-steps";
import {
  PERSONALIZATION_DEPTH_NOTE,
  PERSONALIZATION_DEPTHS,
  PERSONALIZATION_STYLES,
  PERSONALIZATION_TRADITIONS,
} from "@/lib/journey/personalization-labels";
import { cn, hasSupabaseEnv } from "@/lib/utils";

function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition focus-within:ring-1 focus-within:ring-ring",
        checked
          ? "border-wine/35 bg-wine/[0.06] shadow-[inset_0_0_0_1px_rgba(107,46,58,0.12)]"
          : "border-border/70 bg-card/50 hover:border-border hover:bg-card/80",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-wine"
      />
      <span className="min-w-0">
        <span className="block font-medium text-ink">{label}</span>
        <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
          {description}
        </span>
      </span>
    </label>
  );
}

export function PersonalizationForm() {
  const router = useRouter();
  const [traditionKey, setTraditionKey] = useState<string>("ecumenical");
  const [responseStyle, setResponseStyle] = useState<string>("reflective");
  const [preferredDepth, setPreferredDepth] = useState<string>("balanced");
  const [saintsContentEnabled, setSaintsContentEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allowsSaints = traditionKey === "catholic";
  const completedCount =
    Number(Boolean(traditionKey)) +
    Number(Boolean(responseStyle)) +
    Number(Boolean(preferredDepth));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!hasSupabaseEnv()) {
        setError("A personalização requer conexão configurada.");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/entrar?next=/personalizar");
        return;
      }

      const { error: upsertError } = await supabase
        .from("spiritual_profiles")
        .upsert({
          user_id: user.id,
          tradition_key: traditionKey,
          response_style: responseStyle,
          preferred_depth: preferredDepth,
          saints_content_enabled: allowsSaints && saintsContentEnabled,
          onboarding_completed: true,
        });

      if (upsertError) {
        setError("Não foi possível salvar seu perfil. Tente novamente.");
        return;
      }

      router.push("/conversar");
      router.refresh();
    } catch {
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <ProgressSteps
        label="Etapas da personalização"
        steps={[
          {
            label: "Tradição",
            status: traditionKey ? "done" : "current",
          },
          {
            label: "Estilo",
            status: responseStyle
              ? traditionKey
                ? "done"
                : "upcoming"
              : traditionKey
                ? "current"
                : "upcoming",
          },
          {
            label: "Profundidade",
            status:
              completedCount >= 3
                ? "done"
                : completedCount === 2
                  ? "current"
                  : "upcoming",
          },
        ]}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Tradição cristã</legend>
        {PERSONALIZATION_TRADITIONS.map((tradition) => (
          <ChoiceCard
            key={tradition.key}
            name="tradition"
            value={tradition.key}
            checked={traditionKey === tradition.key}
            onChange={() => {
              setTraditionKey(tradition.key);
              if (tradition.key !== "catholic") {
                setSaintsContentEnabled(false);
              }
            }}
            label={tradition.label}
            description={tradition.description}
          />
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Estilo</legend>
        {PERSONALIZATION_STYLES.map((style) => (
          <ChoiceCard
            key={style.key}
            name="style"
            value={style.key}
            checked={responseStyle === style.key}
            onChange={() => setResponseStyle(style.key)}
            label={style.label}
            description={style.description}
          />
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Profundidade padrão</legend>
        {PERSONALIZATION_DEPTHS.map((depth) => (
          <ChoiceCard
            key={depth.key}
            name="depth"
            value={depth.key}
            checked={preferredDepth === depth.key}
            onChange={() => setPreferredDepth(depth.key)}
            label={depth.label}
            description={depth.description}
          />
        ))}
        <p className="text-xs leading-relaxed text-ink-soft">
          {PERSONALIZATION_DEPTH_NOTE}
        </p>
      </fieldset>

      {allowsSaints ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-3.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={saintsContentEnabled}
            onChange={(e) => setSaintsContentEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-wine"
          />
          <span>
            Permitir conteúdo relacionado a santos quando apropriado
          </span>
        </label>
      ) : null}

      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      <div aria-live="polite" className="sr-only">
        {loading ? "Salvando preferências…" : ""}
      </div>

      <Button
        type="submit"
        className="min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto sm:min-w-[12rem]"
        disabled={loading || !hasSupabaseEnv()}
      >
        {loading ? "Salvando…" : "Salvar e começar"}
      </Button>
    </form>
  );
}

/** @deprecated Prefer PersonalizationForm */
export const OnboardingForm = PersonalizationForm;
