"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InlineNotice } from "@/components/platform/inline-notice";
import { Button } from "@/components/ui/button";
import type { ChatResponsePayload } from "@/lib/ai/chat-schema";
import { formatBiblicalReference } from "@/lib/biblical";
import { cn } from "@/lib/utils";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: Pick<
    ChatResponsePayload,
    "biblicalReferences" | "interpretationNotice" | "followUpQuestion"
  >;
}

const WELCOME =
  "Traga sua situação com calma. Vamos refletir à luz das Escrituras.";

export function ChatPanel({
  initialConversationId = null,
  initialMessages,
  traditionLabel,
  depthLabel,
  initialDraft,
}: {
  initialConversationId?: string | null;
  initialMessages?: UiMessage[];
  traditionLabel?: string;
  depthLabel?: string;
  initialDraft?: string;
}) {
  const hasHistory = Boolean(initialMessages && initialMessages.length > 0);
  const [messages, setMessages] = useState<UiMessage[]>(
    hasHistory
      ? initialMessages!
      : [
          {
            id: "welcome",
            role: "assistant",
            content: WELCOME,
          },
        ],
  );
  const [input, setInput] = useState(initialDraft?.trim() ?? "");
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distance < 96);
  }, []);

  useEffect(() => {
    if (!stickToBottom) return;
    const behavior = prefersReducedMotion.current ? "auto" : "smooth";
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, [messages, loading, stickToBottom]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);
    setStickToBottom(true);
    const requestId = pendingRequestId ?? crypto.randomUUID();
    setPendingRequestId(requestId);

    const userMessage: UiMessage = {
      id: requestId,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => {
      if (prev.some((m) => m.id === requestId && m.role === "user")) return prev;
      return [...prev, userMessage];
    });
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          personaKey: "jesus",
          requestId,
        }),
      });

      const data = (await response.json()) as
        | ChatResponsePayload
        | { message?: string; error?: string; code?: string };

      if (!response.ok) {
        const code = "code" in data ? data.code : undefined;
        if (response.status === 402 || code === "subscription_required") {
          setError(
            "Sua assinatura não está ativa no momento. Revise em Conta para continuar.",
          );
        } else if (response.status === 429 || code === "rate_limited") {
          setError(
            "Você enviou várias mensagens em pouco tempo. Aguarde um momento e tente de novo.",
          );
        } else {
          setError(
            ("message" in data && data.message) ||
              "Não foi possível responder agora. Tente novamente em instantes.",
          );
        }
        return;
      }

      const payload = data as ChatResponsePayload;
      setConversationId(payload.conversationId);
      setPendingRequestId(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `${payload.requestId}-assistant`,
          role: "assistant",
          content: payload.answer,
          meta: {
            biblicalReferences: payload.biblicalReferences,
            interpretationNotice: payload.interpretationNotice,
            followUpQuestion: payload.followUpQuestion,
          },
        },
      ]);
    } catch {
      setError("Falha de conexão. Verifique a internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const profileBits = [traditionLabel, depthLabel].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-[0_8px_30px_rgba(44,36,28,0.04)] sm:min-h-[70vh]">
      <header className="shrink-0 border-b border-border/70 px-4 py-3.5 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl text-ink">Reflexão</h1>
            {profileBits ? (
              <p className="mt-0.5 text-xs text-ink-soft">{profileBits}</p>
            ) : null}
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Experiência com inteligência artificial · reflexão baseada nas
              Escrituras, não voz divina.
            </p>
          </div>
          <Link
            href="/conversas"
            className="shrink-0 rounded-md px-2 py-2 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Histórico
          </Link>
        </div>
      </header>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-5 font-chat sm:px-5"
        aria-live="polite"
        aria-relevant="additions"
      >
        {!hasHistory && messages.length === 1 ? (
          <p className="text-sm text-ink-soft">
            Esta será sua primeira reflexão. Escreva com as próprias palavras.
          </p>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
            aria-label={
              message.role === "user" ? "Sua mensagem" : "Resposta do Amém Chat"
            }
            className={cn(
              "max-w-[40rem] rounded-2xl px-4 py-3.5",
              message.role === "user"
                ? "ml-auto rounded-br-md bg-ink text-sand-50"
                : "rounded-bl-md border border-border/70 bg-sand-50/95 text-ink",
            )}
          >
            <p className="whitespace-pre-wrap text-[15px] leading-[1.65]">
              {message.content}
            </p>
            {message.meta ? (
              <div className="mt-3 space-y-2 border-t border-border/40 pt-3 text-sm text-ink-soft">
                {message.meta.biblicalReferences.length > 0 ? (
                  <p className="rounded-lg bg-sand-100/80 px-2.5 py-2 text-[13px] leading-relaxed text-ink">
                    <span className="font-medium">Referências · </span>
                    {message.meta.biblicalReferences
                      .map((ref) => formatBiblicalReference(ref))
                      .join(" · ")}
                  </p>
                ) : null}
                <p className="text-xs leading-relaxed">
                  {message.meta.interpretationNotice}
                </p>
                {message.meta.followUpQuestion ? (
                  <p className="italic text-ink/90">
                    {message.meta.followUpQuestion}
                  </p>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}

        {loading ? (
          <p
            className="animate-soft-pulse text-sm text-ink-soft"
            role="status"
            aria-live="polite"
          >
            Preparando uma reflexão…
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 shrink-0 border-t border-border/70 bg-card/95 p-4 backdrop-blur-sm sm:p-5">
        {error ? (
          <div className="mb-3">
            <InlineNotice tone="error">{error}</InlineNotice>
          </div>
        ) : null}
        <div className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Sua mensagem
          </label>
          <textarea
            id="chat-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Compartilhe sua situação…"
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? "chat-error" : "chat-composer-hint"
            }
            className="min-h-[3.25rem] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:text-sm"
            maxLength={4000}
            disabled={loading}
          />
          <Button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            className="min-h-[3.25rem] self-end bg-ink px-4 hover:bg-ink/90"
          >
            {loading ? "Enviando…" : "Enviar"}
          </Button>
        </div>
        <p
          id="chat-composer-hint"
          className="mt-2 hidden text-xs text-ink-soft sm:block"
        >
          Enter para enviar · Shift+Enter para nova linha
        </p>
        {error ? (
          <p id="chat-error" className="sr-only">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
