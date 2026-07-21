import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChatPanel } from "@/components/chat/chat-panel";
import { InlineNotice } from "@/components/platform/inline-notice";
import { RefreshPageButton } from "@/components/platform/refresh-page-button";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth";
import { mapStoredMessagesToUi } from "@/lib/conversations/chat-history-ui";
import { getRepositories } from "@/lib/database/repositories";
import { canUseDeepResponseOnDemand } from "@/lib/entitlements";
import { isUuid } from "@/lib/navigation/safe-next-path";
import {
  preferredDepthLabelPt,
  traditionLabelPt,
} from "@/lib/profile/labels-pt";
import {
  getRequiredDestinationForState,
  journeyAllowsChat,
  resolveUserJourneyState,
} from "@/lib/journey";
import { sanitizeThemeDraft } from "@/lib/journey/theme-shortcuts";
import { buildJourneyStepChatPrefill } from "@/lib/journeys/chat-prefill";
import { logJourneyOperationalEvent } from "@/lib/journeys/events";

export default async function ConversarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/conversar");
  }

  const journey = await resolveUserJourneyState();
  if (!journeyAllowsChat(journey.state)) {
    redirect(getRequiredDestinationForState(journey.state));
  }

  const params = await searchParams;
  const raw = params.c;
  const conversationParam = Array.isArray(raw) ? raw[0] : raw;
  const temaRaw = params.tema;
  const temaParam = Array.isArray(temaRaw) ? temaRaw[0] : temaRaw;
  const jornadaRaw = params.jornada;
  const etapaRaw = params.etapa;
  const jornadaParam = Array.isArray(jornadaRaw) ? jornadaRaw[0] : jornadaRaw;
  const etapaParam = Array.isArray(etapaRaw) ? etapaRaw[0] : etapaRaw;
  const journeyPrefill = buildJourneyStepChatPrefill(jornadaParam, etapaParam);
  const initialDraft = journeyPrefill ?? sanitizeThemeDraft(temaParam);

  if (journeyPrefill && jornadaParam && etapaParam) {
    logJourneyOperationalEvent({
      event: "journey_chat_prefill_opened",
      userId: auth.userId,
      planKey: auth.planKey,
      journeySlug: jornadaParam.trim(),
      stepId: etapaParam.trim(),
      origin: "conversar_page",
    });
  }

  const traditionLabel = traditionLabelPt(
    auth.spiritualProfile.traditionKey,
  );
  const depthLabel = preferredDepthLabelPt(
    auth.spiritualProfile.preferredDepth,
  );
  const canDeepen = canUseDeepResponseOnDemand(auth.planKey);

  const panelProps = {
    traditionLabel,
    depthLabel,
    initialDraft,
    canDeepen,
    currentPlanKey: auth.planKey,
  };

  if (!conversationParam?.trim()) {
    return <ChatPanel {...panelProps} />;
  }

  if (!isUuid(conversationParam)) {
    return (
      <div className="space-y-4">
        <InlineNotice tone="info">
          Este link de conversa é inválido. Você pode começar uma nova reflexão
          ou abrir uma conversa pelo histórico.
        </InlineNotice>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/conversas">Ver histórico</Link>
          </Button>
        </div>
        <ChatPanel {...panelProps} />
      </div>
    );
  }

  const repos = getRepositories();
  let conversationId: string | null = null;
  let initialMessages: ReturnType<typeof mapStoredMessagesToUi> = [];
  let loadError = false;

  try {
    const conversation = await repos.conversations.getByIdForUser(
      conversationParam,
      auth.userId,
    );
    if (conversation) {
      const messages = await repos.messages.listRecent(
        conversation.id,
        auth.userId,
        200,
      );
      conversationId = conversation.id;
      initialMessages = mapStoredMessagesToUi(messages);
    }
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <div
        className="space-y-4 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-5 sm:px-5"
        role="alert"
      >
        <InlineNotice tone="error">
          Não foi possível carregar esta conversa agora. Tente novamente em
          instantes — sua reflexão continua salva.
        </InlineNotice>
        <div className="flex flex-wrap gap-2">
          <RefreshPageButton />
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/conversas">Ver histórico</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/conversar">Nova reflexão</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!conversationId) {
    notFound();
  }

  return (
    <ChatPanel
      {...panelProps}
      initialConversationId={conversationId}
      initialMessages={initialMessages}
    />
  );
}
