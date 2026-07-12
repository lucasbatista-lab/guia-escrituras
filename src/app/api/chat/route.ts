import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { runChatTurn } from "@/lib/ai/chat-service";
import { getAuthUserContext } from "@/lib/auth";
import { logger } from "@/lib/logging/logger";
import { toClientError } from "@/lib/safety";
import { assertMessageSafe, sanitizeUserMessage } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const auth = await getAuthUserContext();
    if (!auth) {
      return NextResponse.json(
        { code: "unauthenticated", message: "Faça login para conversar.", requestId },
        { status: 401 },
      );
    }

    const json: unknown = await request.json();
    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "validation_error",
          message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
          requestId,
        },
        { status: 400 },
      );
    }

    const message = sanitizeUserMessage(parsed.data.message);
    const safety = assertMessageSafe(message);
    if (!safety.ok) {
      return NextResponse.json(
        { code: "unsafe_input", message: safety.error, requestId },
        { status: 400 },
      );
    }

    const result = await runChatTurn({
      requestId,
      auth,
      body: { ...parsed.data, message },
    });

    return NextResponse.json(result);
  } catch (error) {
    const client = toClientError(error);
    logger.error("chat_route_error", {
      requestId,
      code: client.code,
      // Do not leak stack to client; log message only
      err: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status },
    );
  }
}
