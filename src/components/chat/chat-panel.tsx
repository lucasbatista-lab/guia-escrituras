"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ChatResponsePayload } from "@/lib/ai/chat-schema";
import { formatBiblicalReference } from "@/lib/biblical";
import { IDENTITY_DISCLAIMER } from "@/lib/theology";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: ChatResponsePayload;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `${IDENTITY_DISCLAIMER}\n\nTraga sua situação com calma. Vamos refletir à luz das Escrituras.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);
    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          personaKey: "jesus",
        }),
      });

      const data = (await response.json()) as
        | ChatResponsePayload
        | { message?: string; error?: string };

      if (!response.ok) {
        setError(
          ("message" in data && data.message) ||
            "Não foi possível responder agora.",
        );
        return;
      }

      const payload = data as ChatResponsePayload;
      setConversationId(payload.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: payload.requestId,
          role: "assistant",
          content: payload.answer,
          meta: payload,
        },
      ]);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col rounded-2xl border border-border/80 bg-card/70 shadow-sm">
      <div className="border-b border-border/70 px-4 py-3 sm:px-5">
        <h1 className="font-display text-xl text-ink">Conversar</h1>
        <p className="text-xs text-ink-soft">
          Mentor principal: interpretação baseada nos Evangelhos
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 font-chat sm:px-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-sand-50"
                : "max-w-[95%] rounded-2xl rounded-bl-md border border-border/70 bg-sand-50/90 px-4 py-3 text-ink"
            }
          >
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {message.content}
            </p>
            {message.meta && (
              <div className="mt-3 space-y-2 border-t border-border/50 pt-3 text-sm text-ink-soft">
                {message.meta.biblicalReferences.length > 0 && (
                  <p>
                    Referências:{" "}
                    {message.meta.biblicalReferences
                      .map((ref) => formatBiblicalReference(ref))
                      .join(" · ")}
                  </p>
                )}
                <p>{message.meta.interpretationNotice}</p>
                {message.meta.followUpQuestion && (
                  <p className="italic">{message.meta.followUpQuestion}</p>
                )}
                <p className="text-xs">
                  {message.meta.usage.label}
                  {message.meta.provider === "mock" ? " · demonstração" : ""}
                </p>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <p className="animate-soft-pulse text-sm text-ink-soft">
            Preparando uma reflexão…
          </p>
        )}
      </div>

      <div className="border-t border-border/70 p-4 sm:p-5">
        {error && (
          <p className="mb-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
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
            className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            maxLength={4000}
          />
          <Button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            className="self-end bg-ink hover:bg-ink/90"
          >
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
