"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { InlineNotice } from "@/components/platform/inline-notice";
import { Button } from "@/components/ui/button";
import type { ChatResponsePayload } from "@/lib/ai/chat-schema";
import {
  consumeChatNdjsonStream,
  looksLikeStructuredJsonLeak,
} from "@/lib/ai/chat-stream-protocol";
import {
  hasRenderableFollowUpQuestion,
  hasRenderableInterpretationNotice,
} from "@/lib/ai/normalize-assistant-presentation";
import { formatBiblicalReference } from "@/lib/biblical";
import {
  appendAssistantUiMessage,
  assistantMessageId,
  conversationHasCrisisSafetyMode,
  rollbackOptimisticUserMessage,
  rollbackStreamingAssistantMessage,
  upsertStreamingAssistantMessage,
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
import { THEME_SHORTCUTS } from "@/lib/journey/theme-shortcuts";

type UiMessage = ChatUiMessage;

const EMPTY_EXAMPLE =
  "Estou com medo de tomar uma decisão profissional errada e preciso organizar minhas prioridades.";

export function ChatPanel({
  userId,
  initialConversationId = null,
  initialMessages,
  traditionLabel,
  depthLabel,
  initialDraft,
  canDeepen = false,
  currentPlanKey = null,
  historyMayBeTruncated = false,
  chatFeatureDisabled = false,
  deepenFeatureDisabled = false,
}: {
  /** Authenticated user id — scopes session drafts; never email. */
  userId: string;
  initialConversationId?: string | null;
  initialMessages?: UiMessage[];
  traditionLabel?: string;
  depthLabel?: string;
  initialDraft?: string;
  /** Server-resolved: Profundo / Particular provisioned only. */
  canDeepen?: boolean;
  currentPlanKey?: PlanKey | null;
  /** True when the server loaded a full message page (older turns may exist). */
  historyMayBeTruncated?: boolean;
  /** Ops kill switch — chat mutations blocked server-side. */
  chatFeatureDisabled?: boolean;
  /** Ops kill switch — Aprofundar blocked; standard chat may remain. */
  deepenFeatureDisabled?: boolean;
}) {
  const hasHistory = Boolean(initialMessages && initialMessages.length > 0);
  const [messages, setMessages] = useState<UiMessage[]>(
    hasHistory ? initialMessages! : [],
  );
  const [input, setInput] = useState(() =>
    resolveInitialComposerInput({
      urlDraft: initialDraft,
      conversationId: initialConversationId,
      userId,
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
    // Never surface commercial upgrade CTAs after a crisis-classified turn.
    if (conversationHasCrisisSafetyMode(messages)) return null;
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
  }, [currentPlanKey, errorKind, messages]);

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
  const inflightTextRef = useRef<string | null>(null);
  const inflightRequestIdRef = useRef<string | null>(null);

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
    writeComposerDraft(conversationId, input, undefined, userId);
  }, [conversationId, input, userId]);

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

    if (chatFeatureDisabled) {
      setError(
        "O chat está temporariamente indisponível por manutenção operacional. Seu histórico e a ajuda continuam acessíveis.",
      );
      setErrorKind("unavailable");
      return;
    }

    sendingRef.current = true;
    setError(null);
    setErrorKind(null);
    setLoading(true);
    setStickToBottom(true);
    const requestId = pendingRequestId ?? crypto.randomUUID();
    const isRetry = Boolean(pendingRequestId);
    const crisisContext = conversationHasCrisisSafetyMode(messages);
    const useDeep =
      canDeepen && !crisisContext && !deepenFeatureDisabled
        ? isRetry
          ? pendingDeepRef.current
          : preferDeep
        : false;
    if (!isRetry) {
      pendingDeepRef.current = useDeep;
    }
    setSendingDeep(useDeep);
    setPendingRequestId(requestId);
    inflightTextRef.current = trimmed;
    inflightRequestIdRef.current = requestId;

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

    const applyClientError = (
      view: ReturnType<typeof resolveChatClientError>,
    ) => {
      setError(view.message);
      setErrorKind(view.kind);
      setInput(trimmed);
      setMessages((prev) => {
        let next = rollbackStreamingAssistantMessage(prev, requestId);
        if (!view.keepPendingRequest) {
          next = rollbackOptimisticUserMessage(next, requestId);
        }
        return next;
      });
      if (!view.keepPendingRequest) {
        setPendingRequestId(null);
        pendingDeepRef.current = false;
        setSendingDeep(false);
      }
      if (view.clearDeepPreference) {
        setPreferDeep(false);
        pendingDeepRef.current = false;
        setSendingDeep(false);
      }
    };

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

      const contentType = response.headers.get("Content-Type") ?? "";
      const isNdjson = contentType.toLowerCase().includes("ndjson");

      if (!response.ok || !isNdjson) {
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
          applyClientError(
            resolveChatClientError({
              status: response.status,
              code,
              message: serverMessage,
              retryAfterSeconds: parseRetryAfterHeader(
                response.headers.get("Retry-After"),
              ),
            }),
          );
          return;
        }
        const payload = data as ChatResponsePayload;
        clearComposerDraft(conversationId, undefined, userId);
        clearComposerDraft(payload.conversationId, undefined, userId);
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
            safetyMode: payload.safetyMode,
          }),
        );
        return;
      }

      let pendingSnapshot = "";
      let lastFlushAt = 0;
      let rafId = 0;
      const streamOutcome: {
        completed: ChatResponsePayload | null;
        error: { code: string; message: string } | null;
      } = { completed: null, error: null };

      const flushSnapshot = () => {
        if (!pendingSnapshot) return;
        if (looksLikeStructuredJsonLeak(pendingSnapshot)) return;
        const answer = pendingSnapshot;
        setMessages((prev) =>
          upsertStreamingAssistantMessage(prev, { requestId, answer }),
        );
      };

      const scheduleSnapshot = (answer: string) => {
        pendingSnapshot = answer;
        const now = Date.now();
        if (now - lastFlushAt >= 50) {
          lastFlushAt = now;
          flushSnapshot();
          return;
        }
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          lastFlushAt = Date.now();
          flushSnapshot();
        });
      };

      await consumeChatNdjsonStream(
        response,
        (event) => {
          if (
            abortController.signal.aborted ||
            generation !== sendGenerationRef.current
          ) {
            return;
          }
          if (event.type === "started") {
            setConversationId(event.conversationId);
            syncConversationUrl(event.conversationId);
            return;
          }
          if (event.type === "assistant_snapshot") {
            scheduleSnapshot(event.answer);
            return;
          }
          if (event.type === "completed") {
            streamOutcome.completed = event.payload;
            return;
          }
          if (event.type === "error") {
            streamOutcome.error = { code: event.code, message: event.message };
          }
        },
        abortController.signal,
      );

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }

      if (
        abortController.signal.aborted ||
        generation !== sendGenerationRef.current
      ) {
        return;
      }

      if (streamOutcome.error) {
        applyClientError(
          resolveChatClientError({
            status: 503,
            code: streamOutcome.error.code,
            message: streamOutcome.error.message,
          }),
        );
        return;
      }

      if (!streamOutcome.completed) {
        applyClientError(
          resolveChatClientError({
            status: 503,
            code: "ai_failed",
            message:
              "Não foi possível concluir esta reflexão agora. Sua mensagem continua aqui para você tentar novamente.",
          }),
        );
        return;
      }

      const payload = streamOutcome.completed;
      if (rafId === 0) {
        pendingSnapshot = "";
      }
      clearComposerDraft(conversationId, undefined, userId);
      clearComposerDraft(payload.conversationId, undefined, userId);
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
          safetyMode: payload.safetyMode,
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
      applyClientError(
        resolveChatClientError({
          status: 503,
          code: "ai_failed",
          message:
            "Não foi possível concluir esta reflexão agora. Sua mensagem continua aqui para você tentar novamente.",
        }),
      );
    } finally {
      if (generation === sendGenerationRef.current) {
        sendingRef.current = false;
        setLoading(false);
        inflightTextRef.current = null;
        inflightRequestIdRef.current = null;
      }
    }
  }

  function cancelInFlightSend() {
    if (!loading && !sendingRef.current) return;
    abortRef.current?.abort();
    sendGenerationRef.current += 1;
    const text = inflightTextRef.current;
    const reqId = inflightRequestIdRef.current;
    if (text) setInput(text);
    if (reqId) {
      setMessages((prev) =>
        rollbackOptimisticUserMessage(
          rollbackStreamingAssistantMessage(prev, reqId),
          reqId,
        ),
      );
    }
    setPendingRequestId(null);
    pendingDeepRef.current = false;
    setSendingDeep(false);
    setError(null);
    setErrorKind(null);
    sendingRef.current = false;
    setLoading(false);
    inflightTextRef.current = null;
    inflightRequestIdRef.current = null;
    inputRef.current?.focus();
  }

  function activateDeepenFromReply() {
    if (!canDeepen || deepenFeatureDisabled || loading || chatFeatureDisabled) {
      return;
    }
    if (conversationHasCrisisSafetyMode(messages)) return;
    setPreferDeep(true);
    setStickToBottom(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function cancelDeepenMode() {
    setPreferDeep(false);
    pendingDeepRef.current = false;
  }

  const profileBits = [traditionLabel, depthLabel].filter(Boolean).join(" · ");
  const suppressCommercialPrompts = conversationHasCrisisSafetyMode(messages);
  const deepenEligible =
    canDeepen && !deepenFeatureDisabled && !suppressCommercialPrompts;
  const deepenActive = deepenEligible && preferDeep;
  const showEmptyState = !hasHistory && messages.length === 0;
  const inflightAssistantId = pendingRequestId
    ? assistantMessageId(pendingRequestId)
    : null;
  const showPreparingStatus =
    loading &&
    !messages.some(
      (m) => m.id === inflightAssistantId && m.role === "assistant",
    );
  const showDeepenControls = deepenEligible;
  const showDeepUpsellHint =
    !canDeepen && !suppressCommercialPrompts && !chatFeatureDisabled;


  return (
    <div className="chat-shell-min-h -mx-4 flex flex-col overflow-x-hidden overflow-y-hidden border-y border-border/80 bg-card/80 shadow-[0_8px_30px_rgba(44,36,28,0.04)] sm:mx-0 sm:rounded-2xl sm:border">
      <header className="shrink-0 border-b border-border/70 px-4 py-2 sm:px-5 sm:py-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-lg text-ink sm:text-xl">Reflexão</h1>
            {profileBits ? (
              <p className="truncate text-xs text-ink-soft">{profileBits}</p>
            ) : null}
            <p className="sr-only">
              Experiência com inteligência artificial baseada nas Escrituras,
              não voz divina.
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
        className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-4 font-chat sm:px-5 sm:py-5"
      >
        {historyMayBeTruncated ? (
          <InlineNotice tone="info">
            Mostrando as mensagens mais recentes desta conversa. As mais antigas
            continuam salvas no histórico.
          </InlineNotice>
        ) : null}

        {showEmptyState ? (
          <div className="mx-auto max-w-[40rem] space-y-4 py-2 sm:py-5">
            <h2 className="font-display text-xl text-ink sm:text-2xl">
              Escreva o que você está vivendo
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              Não precisa organizar tudo antes. Conte a situação com suas
              próprias palavras, e o Amém Chat ajudará a refletir à luz das
              Escrituras e a pensar em próximos passos possíveis.
            </p>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
                Comece por uma situação
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {THEME_SHORTCUTS.slice(0, 4).map((theme) => (
                  <button
                    key={theme.label}
                    type="button"
                    className="min-h-11 rounded-full border border-border/70 bg-card px-3 text-sm text-ink transition hover:border-wine/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setInput(theme.prompt);
                      requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-ink-soft">
              Exemplo: {EMPTY_EXAMPLE}
            </p>
            <p className="text-xs leading-relaxed text-ink-soft">
              Conversas não são públicas. {RESPONSE_FORMAT_HINT}
            </p>
            {canDeepen && !suppressCommercialPrompts && !deepenFeatureDisabled ? (
              <p className="text-xs leading-relaxed text-ink-soft">
                Em situações complexas, use “Aprofundar este tema” sob uma
                resposta — ou a opção secundária no campo de mensagem — antes de enviar.
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
            {message.role === "assistant" && message.meta?.deepened ? (
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Você pode seguir conversando normalmente. Aprofundar é opcional
                e vale só para o próximo envio se você marcar de novo.
              </p>
            ) : null}
            {message.meta && !message.meta.streaming ? (
              <AssistantMetaFooter meta={message.meta} />
            ) : null}
            {message.role === "assistant" &&
            deepenEligible &&
            !loading &&
            !chatFeatureDisabled &&
            message.content.trim().length > 0 &&
            message.meta?.safetyMode !== "crisis" &&
            !message.meta?.deepened ? (
              <div className="mt-3 border-t border-border/50 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full border-wine/25 text-ink sm:w-auto"
                  aria-pressed={preferDeep}
                  onClick={() => activateDeepenFromReply()}
                >
                  Aprofundar este tema
                </Button>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  Não envia sozinho — ativa o modo no campo de mensagem para a
                  próxima mensagem.
                </p>
              </div>
            ) : null}
          </article>
        ))}

        {showPreparingStatus ? (
          <p
            className="animate-soft-pulse text-sm text-ink-soft"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            {sendingDeep
              ? "Preparando uma reflexão aprofundada…"
              : "Preparando uma reflexão…"}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="safe-composer-pad sticky bottom-0 shrink-0 border-t border-border/70 bg-card/95 p-3 backdrop-blur-sm sm:p-5">
        {chatFeatureDisabled ? (
          <InlineNotice tone="info">
            O chat está temporariamente indisponível por manutenção operacional.
            Seu histórico e a ajuda continuam acessíveis.
          </InlineNotice>
        ) : null}
        {deepenFeatureDisabled && canDeepen && !chatFeatureDisabled ? (
          <p className="mb-3 text-xs leading-relaxed text-ink-soft">
            Aprofundar está temporariamente indisponível. Você pode continuar com
            respostas padrão.
          </p>
        ) : null}
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
              ) : errorKind === "not_found" ? (
                <>
                  <Button asChild variant="outline" className="min-h-11">
                    <Link href="/conversas">Ver histórico</Link>
                  </Button>
                  <Button asChild variant="outline" className="min-h-11">
                    <Link href="/conversar">Nova reflexão</Link>
                  </Button>
                </>
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

        {showDeepenControls ? (
          <div className="mb-3 space-y-2">
            {deepenActive ? (
              <div
                className="space-y-2 rounded-xl border border-wine/40 bg-wine/5 px-3 py-2.5"
                role="status"
                aria-live="polite"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    Aprofundar ativo para a próxima mensagem
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 shrink-0 text-ink-soft"
                    disabled={loading}
                    onClick={cancelDeepenMode}
                  >
                    Cancelar Aprofundar
                  </Button>
                </div>
                <p className="rounded-lg border border-wine/20 bg-card/80 px-2.5 py-2 text-xs leading-relaxed text-ink">
                  <span className="font-medium">Será aprofundado:</span>{" "}
                  {input.trim()
                    ? input.trim().length > 140
                      ? `${input.trim().slice(0, 140).trim()}…`
                      : input.trim()
                    : "o texto que você escrever abaixo, nesta mensagem."}
                </p>
              </div>
            ) : null}
            {/* Secondary entry — primary is “Aprofundar este tema” under replies.
                Keep checkbox for retries/tests; remove post-launch if unused. */}
            <details className="rounded-lg border border-border/50 bg-sand-50/40 px-3 py-2">
              <summary className="cursor-pointer list-none rounded-md text-xs font-medium text-ink-soft marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                Opção secundária no campo de mensagem
              </summary>
              <div className="mt-2 flex items-start gap-3 border-t border-border/40 pt-2">
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
                  </label>
                  <p
                    id={deepenHelpId}
                    className="mt-0.5 text-xs leading-relaxed text-ink-soft"
                  >
                    Entrada alternativa ao botão sob a resposta: mais contexto,
                    conexões bíblicas e próximos passos práticos. Consome mais
                    do espaço de uso — só nesta resposta, sem alterar seu
                    perfil.
                  </p>
                </div>
              </div>
            </details>
          </div>
        ) : showDeepUpsellHint ? (
          <DeepUpsellHint />
        ) : null}

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
            placeholder={
              deepenActive
                ? "O que você gostaria de explorar com mais atenção?"
                : "Conte o que você está vivendo…"
            }
            aria-invalid={Boolean(error)}
            aria-busy={loading}
            aria-describedby={
              error
                ? "chat-error"
                : showDeepenControls
                  ? `${deepenHelpId} chat-composer-hint`
                  : "chat-composer-hint"
            }
            className="min-h-[3.25rem] max-h-40 flex-1 resize-none overflow-y-auto rounded-xl border border-input bg-background px-3 py-2.5 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            maxLength={4000}
            disabled={loading}
          />
          {loading ? (
            <Button
              type="button"
              variant="outline"
              onClick={cancelInFlightSend}
              className="min-h-[3.25rem] min-w-11 self-end px-4"
            >
              Cancelar
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim()}
              className="min-h-[3.25rem] min-w-11 self-end bg-ink px-4 hover:bg-ink/90"
            >
              {deepenActive ? "Aprofundar e enviar" : "Enviar"}
            </Button>
          )}
        </div>
        <p id="chat-composer-hint" className="mt-2 text-xs text-ink-soft">
          {loading
            ? "Você pode cancelar o envio e editar o texto."
            : "Enter envia · Shift+Enter nova linha"}
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
