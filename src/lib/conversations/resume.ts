import "server-only";

import { getRepositories } from "@/lib/database/repositories";
import {
  conversationTitleLabel,
  sanitizeConversationPreview,
} from "@/lib/conversations/display";

export {
  RESUME_PREVIEW_MAX_CHARS,
  sanitizeConversationPreview,
  conversationTitleLabel,
  formatConversationActivity,
  resumeReturnTone,
  resumeReturnCopy,
  type ResumeReturnTone,
} from "@/lib/conversations/display";

export interface ConversationResumePreview {
  conversationId: string;
  title: string;
  updatedAt: string;
  /** Safe truncated snippet of the user's latest message, or null. */
  preview: string | null;
}

/**
 * Load the most recently active conversation for resume UI.
 * At most 1 conversation + 1 user message; no OpenAI; ownership via userId filter.
 */
export async function loadLatestResumePreview(
  userId: string,
): Promise<ConversationResumePreview | null> {
  const repos = getRepositories();
  const list = await repos.conversations.listForUser(userId, 1);
  const conversation = list[0];
  if (!conversation || conversation.userId !== userId) return null;

  let preview: string | null = null;
  try {
    const latest = await repos.messages.findLatestUserMessage(
      conversation.id,
      userId,
    );
    if (latest?.content) {
      const snippet = sanitizeConversationPreview(latest.content);
      preview = snippet || null;
    }
  } catch {
    preview = null;
  }

  return {
    conversationId: conversation.id,
    title: conversationTitleLabel(conversation.title),
    updatedAt: conversation.updatedAt,
    preview,
  };
}
