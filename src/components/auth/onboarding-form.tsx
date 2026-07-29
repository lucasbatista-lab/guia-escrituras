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

export function PersonalizationForm({
  completionHref = "/conversar",
}: {
  completionHref?: string;
}) {
  const router = useRouter();
  const [traditionKey, setTraditionKey] = useState<string>("ecumenical");
  const [responseStyle, setResponseStyle] = useState<string>("reflective");
  const [preferredDepth, setPreferredDepth] = useState<string>("balanced");
  const [saintsContentEnabled, setSaintsContentEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const allowsSaints = traditionKey === "catholic";

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

      router.push(completionHref);
      router.refresh();
    } catch {
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <ProgressSteps
        label="Etapas da personalização"
        steps={[
          {
            label: "Tradição",
            status: currentStep > 0 ? "done" : "current",
          },
          {
            label: "Estilo",
            status:
              currentStep > 1
                ? "done"
                : currentStep === 1
                  ? "current"
                  : "upcoming",
          },
          {
            label: "Profundidade",
            status: currentStep === 2 ? "current" : "upcoming",
          },
        ]}
      />

      {currentStep === 0 ? (
        <fieldset className="space-y-3">
          <legend className="font-display text-xl text-ink">Sua tradição cristã</legend>
          <p className="text-sm leading-relaxed text-ink-soft">
            Usamos esta escolha para ajustar linguagem e referências quando for
            relevante. Ela não muda as Escrituras nem define sua fé.
          </p>
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
        </fieldset>
      ) : null}

      {currentStep === 1 ? (
        <fieldset className="space-y-3">
        <legend className="font-display text-xl text-ink">Estilo da conversa</legend>
        <p className="text-sm leading-relaxed text-ink-soft">
          Escolha como prefere que a reflexão organize acolhimento, clareza e
          aplicação prática.
        </p>
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
      ) : null}

      {currentStep === 2 ? (
        <fieldset className="space-y-3">
        <legend className="font-display text-xl text-ink">Profundidade padrão</legend>
        <p className="text-sm leading-relaxed text-ink-soft">
          Define o ritmo inicial das respostas comuns. Você continua no controle
          do que escreve e pode alterar esta preferência depois.
        </p>
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
      ) : null}

      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      <div aria-live="polite" className="sr-only">
        {loading ? "Salvando preferências…" : ""}
      </div>

      <p className="text-xs leading-relaxed text-ink-soft">
        Suas escolhas ficam vinculadas à sua conta e são usadas para personalizar
        a experiência.
      </p>

      <div className="sticky bottom-[calc(4rem+var(--safe-bottom))] z-20 -mx-4 flex gap-2 border-t border-border/70 bg-card/95 px-4 py-3 backdrop-blur-md md:bottom-0 md:mx-0 md:rounded-2xl md:border">
        {currentStep > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={loading}
            onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
          >
            Voltar
          </Button>
        ) : null}
        {currentStep < 2 ? (
          <Button
            type="button"
            className="min-h-11 flex-1 bg-wine hover:bg-wine-soft"
            onClick={() => setCurrentStep((step) => Math.min(2, step + 1))}
          >
            Continuar
          </Button>
        ) : (
          <Button
            type="submit"
            className="min-h-11 flex-1 bg-wine hover:bg-wine-soft"
            disabled={loading || !hasSupabaseEnv()}
          >
            {loading ? "Salvando…" : "Salvar e começar"}
          </Button>
        )}
      </div>
    </form>
  );
}

/** @deprecated Prefer PersonalizationForm */
export const OnboardingForm = PersonalizationForm;
