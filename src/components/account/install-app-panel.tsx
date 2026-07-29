"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallMode = "checking" | "installed" | "prompt" | "ios" | "manual";

export function InstallAppPanel() {
  const [mode, setMode] = useState<InstallMode>("checking");
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & {
      standalone?: boolean;
    };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      navigatorWithStandalone.standalone === true;
    if (standalone) {
      queueMicrotask(() => setMode("installed"));
      document.documentElement.dataset.standalone = "true";
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    queueMicrotask(() => setMode(isIos ? "ios" : "manual"));

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setMode("prompt");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setMode("installed");
    }
    setPromptEvent(null);
  }

  if (mode === "checking") {
    return <p className="text-sm text-ink-soft">Verificando disponibilidade…</p>;
  }

  if (mode === "installed") {
    return (
      <p className="text-sm text-ink-soft" role="status">
        O Amém Chat já está aberto como aplicativo neste dispositivo.
      </p>
    );
  }

  if (mode === "prompt") {
    return (
      <div>
        <p className="text-sm leading-relaxed text-ink-soft">
          Adicione o mesmo Amém Chat à tela inicial para abrir direto no seu
          espaço.
        </p>
        <Button
          type="button"
          className="mt-4 min-h-11 bg-wine hover:bg-wine-soft"
          onClick={() => void install()}
        >
          Instalar Amém Chat
        </Button>
      </div>
    );
  }

  return (
    <details className="rounded-xl border border-border/70 bg-sand-50/60 px-4 py-3">
      <summary className="cursor-pointer font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Instalar Amém Chat
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {mode === "ios"
          ? "No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”."
          : "Quando o navegador oferecer instalação, use o ícone de instalar na barra de endereço ou a opção correspondente no menu."}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-soft">
        A instalação não cria outra conta e não disponibiliza conversas offline.
      </p>
    </details>
  );
}
