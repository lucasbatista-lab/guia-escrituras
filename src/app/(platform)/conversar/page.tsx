import { notFound, redirect } from "next/navigation";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getAuthUserContext } from "@/lib/auth";
import { getRepositories } from "@/lib/database/repositories";
import { isUuid } from "@/lib/navigation/safe-next-path";
import {
  getRequiredDestinationForState,
  journeyAllowsChat,
  resolveUserJourneyState,
} from "@/lib/journey";

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

  if (!conversationParam?.trim()) {
    return <ChatPanel />;
  }

  if (!isUuid(conversationParam)) {
    return <ChatPanel />;
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
    />
  );
}
