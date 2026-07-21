"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { InlineNotice } from "@/components/platform/inline-notice";
import { Button } from "@/components/ui/button";
import type { ChatResponsePayload } from "@/lib/ai/chat-schema";
import {
  hasRenderableFollowUpQuestion,
  hasRenderableInterpretationNotice,
} from "@/lib/ai/normalize-assistant-presentation";
import { formatBiblicalReference } from "@/lib/biblical";
import {
  appendAssistantUiMessage,
  rollbackOptimisticUserMessage,
  syncConversationUrl,
  type ChatUiMessage,
} from "@/lib/conversations/chat-history-ui";
import {
  clearComposerDraft,
  resolveInitialComposerInput,
  writeComposerDraft,
} from "@/lib/conversations/composer-draft";
import { RESPONSE_FORMAT_HINT } from "@/lib/conversations/response-format-hint";
import type { PlanKey } from "@/lib/entitlements";
import { getPlanUpsellSuggestion } from "@/lib/marketing/plan-upsell";
import { cn } from "@/lib/utils";
import {
  parseRetryAfterHeader,
  resolveChatClientError,
} from "@/lib/ai/chat-client-errors";
import {
  ChatPlanUpsell,
  DeepUpsellHint,
} from "@/components/chat/chat-plan-upsell";

type UiMessage = ChatUiMessage;

const EMPTY_EXAMPLE =
  "Estou com medo de tomar uma decisão profissional errada e preciso organizar minhas prioridades.";

export function ChatPanel({
  initialConversationId = null,
  initialMessages,
  traditionLabel,
  depthLabel,
  initialDraft,
  canDeepen = false,
  currentPlanKey = null,
}: {
  initialConversationId?: string | null;
  initialMessages?: UiMessage[];
  traditionLabel?: string;
  depthLabel?: string;
  initialDraft?: string;
  /** Server-resolved: Profundo / Particular provisioned only. */
  canDeepen?: boolean;
  currentPlanKey?: PlanKey | null;
}) {
  const hasHistory = Boolean(initialMessages && initialMessages.length > 0);
  const [messages, setMessages] = useState<UiMessage[]>(
    hasHistory ? initialMessages! : [],
  );
  const [input, setInput] = useState(() =>
    resolveInitialComposerInput({
      urlDraft: initialDraft,
      conversationId: initialConversationId,
    }),
  );
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [preferDeep, setPreferDeep] = useState(false);
  /** Keep preferDeep for retries of the same failed send. */
  const pendingDeepRef = useRef(false);
  const [sendingDeep, setSendingDeep] = useState(false);
  const [errorKind, setErrorKind] = useState<string | null>(null);

  const upsellSuggestion = useMemo(() => {
    if (!errorKind || !currentPlanKey) return null;
    if (errorKind === "deep_not_entitled") {
      return getPlanUpsellSuggestion({
        currentPlanKey,
        origin: "deep_not_entitled",
      });
    }
    if (errorKind === "plan_limit") {
      return getPlanUpsellSuggestion({
        currentPlanKey,
        origin: "usage_limit",
        limitKind: "plan_limit",
      });
    }
    if (errorKind === "daily_burst") {
      return getPlanUpsellSuggestion({
        currentPlanKey,
        origin: "usage_limit",
        limitKind: "daily_burst",
      });
    }
    return null;
  }, [currentPlanKey, errorKind]);

  const deepenId = useId();
  const deepenHelpId = useId();

  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prefersReducedMotion = useRef(false);
  /** Single-flight beyond React `loading` — guards double Enter/click races. */
  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const sendGenerationRef = useRef(0);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    writeComposerDraft(conversationId, input);
  }, [conversationId, input]);

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
    if (!trimmed || loading || sendingRef.current) return;

    sendingRef.current = true;
    setError(null);
    setErrorKind(null);
    setLoading(true);
    setStickToBottom(true);
    const requestId = pendingRequestId ?? crypto.randomUUID();
    const isRetry = Boolean(pendingRequestId);
    const useDeep = canDeepen
      ? isRetry
        ? pendingDeepRef.current
        : preferDeep
      : false;
    if (!isRetry) {
      pendingDeepRef.current = useDeep;
    }
    setSendingDeep(useDeep);
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

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;
    const generation = ++sendGenerationRef.current;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          personaKey: "jesus",
          requestId,
          preferDeep: useDeep,
        }),
      });

      if (
        abortController.signal.aborted ||
        generation !== sendGenerationRef.current
      ) {
        return;
      }

      const data = (await response.json()) as
        | ChatResponsePayload
        | { message?: string; error?: string; code?: string };

      if (
        abortController.signal.aborted ||
        generation !== sendGenerationRef.current
      ) {
        return;
      }

      if (!response.ok) {
        const code = "code" in data ? data.code : undefined;
        const serverMessage =
          "message" in data && typeof data.message === "string"
            ? data.message
            : undefined;
        const view = resolveChatClientError({
          status: response.status,
          code,
          message: serverMessage,
          retryAfterSeconds: parseRetryAfterHeader(
            response.headers.get("Retry-After"),
          ),
        });
        setError(view.message);
        setErrorKind(view.kind);
        // Always restore the draft so the user can retry or edit without losing text.
        setInput(trimmed);
        if (!view.keepPendingRequest) {
          setPendingRequestId(null);
          pendingDeepRef.current = false;
          setSendingDeep(false);
          setMessages((prev) =>
            rollbackOptimisticUserMessage(prev, requestId),
          );
        }
        if (view.clearDeepPreference) {
          setPreferDeep(false);
          pendingDeepRef.current = false;
          setSendingDeep(false);
        }
        return;
      }

      const payload = data as ChatResponsePayload;
      clearComposerDraft(conversationId);
      clearComposerDraft(payload.conversationId);
      setConversationId(payload.conversationId);
      syncConversationUrl(payload.conversationId);
      setPendingRequestId(null);
      pendingDeepRef.current = false;
      setPreferDeep(false);
      setSendingDeep(false);
      setMessages((prev) =>
        appendAssistantUiMessage(prev, {
          requestId: payload.requestId,
          answer: payload.answer,
          biblicalReferences: payload.biblicalReferences,
          interpretationNotice: payload.interpretationNotice,
          followUpQuestion: payload.followUpQuestion,
          deepened: useDeep,
        }),
      );
    } catch (err) {
      if (
        abortController.signal.aborted ||
        generation !== sendGenerationRef.current ||
        (err instanceof DOMException && err.name === "AbortError")
      ) {
        return;
      }
      setError(
        "Não foi possível concluir esta reflexão agora. Sua mensagem continua aqui para você tentar novamente.",
      );
      setErrorKind("retryable");
      setInput(trimmed);
    } finally {
      if (generation === sendGenerationRef.current) {
        sendingRef.current = false;
        setLoading(false);
      }
    }
  }

  const profileBits = [traditionLabel, depthLabel].filter(Boolean).join(" · ");
  const deepenActive = canDeepen && preferDeep;
  const showEmptyState = !hasHistory && messages.length === 0;

  return (
    <div className="chat-shell-min-h flex flex-col overflow-x-hidden overflow-y-hidden rounded-2xl border border-border/80 bg-card/80 shadow-[0_8px_30px_rgba(44,36,28,0.04)]">
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
            className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Histórico
          </Link>
        </div>
      </header>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-5 font-chat sm:px-5"
      >
        {showEmptyState ? (
          <div className="max-w-[40rem] space-y-4">
            <h2 className="font-display text-xl text-ink sm:text-2xl">
              Escreva o que você está vivendo
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              Não precisa organizar tudo antes. Conte a situação com suas
              próprias palavras, e o Amém Chat ajudará a refletir à luz das
              Escrituras e a pensar em próximos passos possíveis.
            </p>
            <ul className="space-y-1.5 text-sm text-ink-soft">
              <li>Diga o que aconteceu.</li>
              <li>Conte o que mais está pesando.</li>
              <li>Explique que tipo de clareza você procura.</li>
            </ul>
            <p className="rounded-xl border border-border/50 bg-sand-50/60 px-3.5 py-3 text-sm italic leading-relaxed text-ink-soft">
              Exemplo: {EMPTY_EXAMPLE}
            </p>
            <p className="text-xs leading-relaxed text-ink-soft">
              {RESPONSE_FORMAT_HINT}
            </p>
            {canDeepen ? (
              <p className="text-xs leading-relaxed text-ink-soft">
                Em situações complexas, você pode ativar “Aprofundar esta
                resposta” antes de enviar.
              </p>
            ) : null}
          </div>
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
            {message.role === "assistant" && message.meta?.deepened ? (
              <p className="mt-2 text-xs font-medium text-wine">
                Resposta aprofundada · só nesta mensagem
              </p>
            ) : null}
            {message.meta ? (
              <AssistantMetaFooter meta={message.meta} />
            ) : null}
          </article>
        ))}

        {loading ? (
          <p
            className="animate-soft-pulse text-sm text-ink-soft"
            role="status"
            aria-live="polite"
          >
            {sendingDeep
              ? "Preparando uma reflexão aprofundada…"
              : "Preparando uma reflexão…"}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="safe-composer-pad sticky bottom-0 shrink-0 border-t border-border/70 bg-card/95 p-4 backdrop-blur-sm sm:p-5">
        {error ? (
          <div className="mb-3 space-y-2" role="alert" aria-live="assertive">
            <InlineNotice tone="error">{error}</InlineNotice>
            {upsellSuggestion ? (
              <ChatPlanUpsell suggestion={upsellSuggestion} />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {errorKind === "auth" ? (
                <Link
                  href="/entrar?next=/conversar"
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Entrar novamente
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={loading || !input.trim()}
                  onClick={() => void send()}
                >
                  Tentar de novo
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {canDeepen ? (
          <div
            className={cn(
              "mb-3 rounded-xl border px-3 py-2.5",
              deepenActive
                ? "border-wine/40 bg-wine/5"
                : "border-border/70 bg-sand-50/50",
            )}
          >
            <div className="flex items-start gap-3">
              <input
                id={deepenId}
                type="checkbox"
                checked={preferDeep}
                onChange={(e) => setPreferDeep(e.target.checked)}
                disabled={loading}
                aria-describedby={deepenHelpId}
                className="mt-2 h-5 w-5 shrink-0 rounded border-border text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="min-w-0">
                <label
                  htmlFor={deepenId}
                  className="block min-h-11 cursor-pointer pt-1.5 text-sm font-medium text-ink"
                >
                  Aprofundar esta resposta
                  {deepenActive ? (
                    <span className="ml-2 text-xs font-normal text-wine">
                      · ativo nesta mensagem
                    </span>
                  ) : null}
                </label>
                <p
                  id={deepenHelpId}
                  className="mt-0.5 text-xs leading-relaxed text-ink-soft"
                >
                  Peça uma reflexão mais ampla desta mensagem: mais contexto da
                  situação, conexões bíblicas e próximos passos práticos. Consome
                  mais da sua margem de uso — só nesta resposta, sem alterar seu
                  perfil.
                </p>
                {deepenActive ? (
                  <p className="mt-2 rounded-lg border border-wine/20 bg-card/80 px-2.5 py-2 text-xs leading-relaxed text-ink">
                    <span className="font-medium">Será aprofundado:</span>{" "}
                    {input.trim()
                      ? input.trim().length > 140
                        ? `${input.trim().slice(0, 140).trim()}…`
                        : input.trim()
                      : "o texto que você escrever abaixo, nesta mensagem."}{" "}
                    Desmarque a caixa se quiser uma resposta padrão.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <DeepUpsellHint />
        )}

        <div className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Conte o que você está vivendo
          </label>
          <textarea
            ref={inputRef}
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
            placeholder="Conte o que você está vivendo…"
            aria-invalid={Boolean(error)}
            aria-describedby={
              error
                ? "chat-error"
                : canDeepen
                  ? `${deepenHelpId} chat-composer-hint`
                  : "chat-composer-hint"
            }
            className="min-h-[3.25rem] max-h-40 flex-1 resize-none overflow-y-auto rounded-xl border border-input bg-background px-3 py-2.5 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            maxLength={4000}
            disabled={loading}
          />
          <Button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            aria-busy={loading}
            className="min-h-[3.25rem] min-w-11 self-end bg-ink px-4 hover:bg-ink/90"
          >
            {loading ? "Enviando…" : deepenActive ? "Aprofundar e enviar" : "Enviar"}
          </Button>
        </div>
        <p id="chat-composer-hint" className="mt-2 text-xs text-ink-soft">
          Enter envia · Shift+Enter nova linha
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

function AssistantMetaFooter({
  meta,
}: {
  meta: NonNullable<UiMessage["meta"]>;
}) {
  const refs = meta.biblicalReferences ?? [];
  const hasRefs = refs.length > 0;
  const hasNotice = hasRenderableInterpretationNotice(meta.interpretationNotice);
  const hasFollowUp = hasRenderableFollowUpQuestion(meta.followUpQuestion);
  if (!hasRefs && !hasNotice && !hasFollowUp) return null;

  const notice = meta.interpretationNotice?.trim() ?? "";
  const followUp = meta.followUpQuestion?.trim() ?? "";

  return (
    <div className="mt-3 space-y-2 border-t border-border/40 pt-3 text-sm text-ink-soft">
      {hasRefs ? (
        <p className="rounded-lg bg-sand-100/80 px-2.5 py-2 text-[13px] leading-relaxed text-ink">
          <span className="font-medium">Referências · </span>
          {refs.map((ref) => formatBiblicalReference(ref)).join(" · ")}
        </p>
      ) : null}
      {hasNotice ? (
        <p className="text-xs leading-relaxed">{notice}</p>
      ) : null}
      {hasFollowUp ? (
        <p className="italic text-ink/90">{followUp}</p>
      ) : null}
    </div>
  );
}
