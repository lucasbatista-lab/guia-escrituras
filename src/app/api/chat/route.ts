import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { runChatTurn } from "@/lib/ai/chat-service";
import { getAuthUserContext } from "@/lib/auth";
import { logger } from "@/lib/logging/logger";
import { maskUserId } from "@/lib/logging/mask";
import { toClientError } from "@/lib/safety";
import { assertMessageSafe, sanitizeUserMessage } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export async function POST(request: Request) {
  let requestId = createRequestId();

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
      const issue = parsed.error.issues[0];
      const isRequestId =
        issue?.path[0] === "requestId"
          ? "Informe um requestId UUID válido."
          : (issue?.message ?? "Dados inválidos.");
      return NextResponse.json(
        {
          code: "validation_error",
          message: isRequestId,
          requestId,
        },
        { status: 400 },
      );
    }

    // Prefer client requestId so retries of the same send are idempotent.
    // Do not trust user_id, cost, tokens or role from the client.
    if (parsed.data.requestId) {
      requestId = parsed.data.requestId;
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
      route: "/api/chat",
      code: client.code,
      status: client.status,
      failureType: client.code,
      flowStatus: "failed",
      retryAfterSeconds: client.retryAfterSeconds ?? null,
      userId: maskUserId(
        error && typeof error === "object" && "userId" in error
          ? String((error as { userId?: string }).userId)
          : undefined,
      ),
      err: error instanceof Error ? error.message : "unknown",
    });
    const headers =
      client.retryAfterSeconds != null
        ? { "Retry-After": String(client.retryAfterSeconds) }
        : undefined;
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers },
    );
  }
}
