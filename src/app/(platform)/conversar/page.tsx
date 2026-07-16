import { notFound, redirect } from "next/navigation";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getAuthUserContext } from "@/lib/auth";
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

export default async function ConversarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/entrar?next=/conversar");
  }

  const journey = await resolveUserJourneyState({ userId: auth.userId });
  if (!journeyAllowsChat(journey.state)) {
    redirect(getRequiredDestinationForState(journey.state));
  }

  const params = await searchParams;
  const raw = params.c;
  const conversationParam = Array.isArray(raw) ? raw[0] : raw;
  const temaRaw = params.tema;
  const temaParam = Array.isArray(temaRaw) ? temaRaw[0] : temaRaw;
  const initialDraft = sanitizeThemeDraft(temaParam);

  const traditionLabel = traditionLabelPt(
    auth.spiritualProfile.traditionKey,
  );
  const depthLabel = preferredDepthLabelPt(
    auth.spiritualProfile.preferredDepth,
  );
  const canDeepen = canUseDeepResponseOnDemand(auth.planKey);

  if (!conversationParam?.trim()) {
    return (
      <ChatPanel
        traditionLabel={traditionLabel}
        depthLabel={depthLabel}
        initialDraft={initialDraft}
        canDeepen={canDeepen}
      />
    );
  }

  if (!isUuid(conversationParam)) {
    return (
      <ChatPanel
        traditionLabel={traditionLabel}
        depthLabel={depthLabel}
        initialDraft={initialDraft}
        canDeepen={canDeepen}
      />
    );
  }

  const repos = getRepositories();
  let conversationId: string | null = null;
  let initialMessages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
  }> = [];

  try {
    const conversation = await repos.conversations.getByIdForUser(
      conversationParam,
      auth.userId,
    );
    if (!conversation) {
      notFound();
    }

    const messages = await repos.messages.listRecent(
      conversation.id,
      auth.userId,
      200,
    );

    conversationId = conversation.id;
    initialMessages = messages.map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  } catch {
    notFound();
  }

  if (!conversationId) {
    notFound();
  }

  return (
    <ChatPanel
      initialConversationId={conversationId}
      initialMessages={initialMessages}
      traditionLabel={traditionLabel}
      depthLabel={depthLabel}
      canDeepen={canDeepen}
    />
  );
}
