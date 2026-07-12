"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TRADITION_POLICIES } from "@/lib/theology";
import { hasSupabaseEnv } from "@/lib/utils";

export function OnboardingForm() {
  const router = useRouter();
  const [traditionKey, setTraditionKey] = useState("ecumenical");
  const [responseStyle, setResponseStyle] = useState("reflective");
  const [preferredDepth, setPreferredDepth] = useState("balanced");
  const [saintsContentEnabled, setSaintsContentEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedTradition = TRADITION_POLICIES.find(
    (t) => t.key === traditionKey,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!hasSupabaseEnv()) {
        router.push("/conversar");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/entrar");
        return;
      }

      const { error: upsertError } = await supabase
        .from("spiritual_profiles")
        .upsert({
          user_id: user.id,
          tradition_key: traditionKey,
          response_style: responseStyle,
          preferred_depth: preferredDepth,
          saints_content_enabled:
            Boolean(selectedTradition?.allowsSaintsContent) &&
            saintsContentEnabled,
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
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Tradição</legend>
        {TRADITION_POLICIES.map((tradition) => (
          <label
            key={tradition.key}
            className="flex cursor-pointer gap-3 rounded-xl border border-border/70 bg-card/50 p-3"
          >
            <input
              type="radio"
              name="tradition"
              value={tradition.key}
              checked={traditionKey === tradition.key}
              onChange={() => {
                setTraditionKey(tradition.key);
                if (!tradition.allowsSaintsContent) {
                  setSaintsContentEnabled(false);
                }
              }}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-ink">{tradition.label}</span>
              <span className="mt-1 block text-xs text-ink-soft">
                {tradition.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="style">Estilo de resposta</Label>
        <select
          id="style"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={responseStyle}
          onChange={(e) => setResponseStyle(e.target.value)}
        >
          <option value="pastoral">Pastoral</option>
          <option value="reflective">Reflexivo</option>
          <option value="practical">Prático</option>
          <option value="study">Estudo</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="depth">Profundidade</Label>
        <select
          id="depth"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={preferredDepth}
          onChange={(e) => setPreferredDepth(e.target.value)}
        >
          <option value="brief">Breve</option>
          <option value="balanced">Equilibrada</option>
          <option value="deep">Profunda</option>
        </select>
      </div>

      {selectedTradition?.allowsSaintsContent && (
        <label className="flex items-start gap-3 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={saintsContentEnabled}
            onChange={(e) => setSaintsContentEnabled(e.target.checked)}
            className="mt-1"
          />
          Permitir conteúdo relacionado a santos quando apropriado
        </label>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full bg-ink hover:bg-ink/90" disabled={loading}>
        {loading ? "Salvando…" : "Concluir e conversar"}
      </Button>
    </form>
  );
}
