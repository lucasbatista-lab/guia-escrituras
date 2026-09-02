import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { runChatTurnStream } from "@/lib/ai/chat-service";
import {
  encodeChatStreamLine,
  type ChatStreamEvent,
} from "@/lib/ai/chat-stream-protocol";
import { getAuthUserContext } from "@/lib/auth";
import { logger } from "@/lib/logging/logger";
import { maskUserId } from "@/lib/logging/mask";
import { toClientError } from "@/lib/safety";
import { assertMessageSafe, sanitizeUserMessage } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store",
} as const;

const NDJSON_HEADERS = {
  ...PRIVATE_NO_STORE,
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "X-Accel-Buffering": "no",
} as const;

export const runtime = "nodejs";
export const maxDuration = 90;

function jsonClientError(error: unknown, requestId: string) {
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
  const headers: Record<string, string> = {
    ...PRIVATE_NO_STORE,
  };
  if (client.retryAfterSeconds != null) {
    headers["Retry-After"] = String(client.retryAfterSeconds);
  }
  return Response.json(
    { code: client.code, message: client.message, requestId },
    { status: client.status, headers },
  );
}

export async function POST(request: Request) {
  let requestId = createRequestId();

  try {
    const auth = await getAuthUserContext();
    if (!auth) {
      return Response.json(
        { code: "unauthenticated", message: "Faça login para conversar.", requestId },
        { status: 401, headers: PRIVATE_NO_STORE },
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
      return Response.json(
        {
          code: "validation_error",
          message: isRequestId,
          requestId,
        },
        { status: 400, headers: PRIVATE_NO_STORE },
      );
    }

    if (parsed.data.requestId) {
      requestId = parsed.data.requestId;
    }

    const message = sanitizeUserMessage(parsed.data.message);
    const safety = assertMessageSafe(message);
    if (!safety.ok) {
      return Response.json(
        { code: "unsafe_input", message: safety.error, requestId },
        { status: 400, headers: PRIVATE_NO_STORE },
      );
    }

    const encoder = new TextEncoder();
    const abortSignal = request.signal;
    const streamRequestId = requestId;
    const iterator = runChatTurnStream({
      requestId: streamRequestId,
      auth,
      body: { ...parsed.data, message },
      abortSignal,
    })[Symbol.asyncIterator]();

    let first: IteratorResult<ChatStreamEvent>;
    try {
      first = await iterator.next();
    } catch (error) {
      return jsonClientError(error, streamRequestId);
    }

    if (first.done) {
      return jsonClientError(
        new Error("empty_chat_stream"),
        streamRequestId,
      );
    }

    const readable = new ReadableStream({
      async start(controller) {
        const send = (event: ChatStreamEvent) => {
          controller.enqueue(encoder.encode(encodeChatStreamLine(event)));
        };
        send(first.value);
        try {
          while (true) {
            const next = await iterator.next();
            if (next.done) break;
            send(next.value);
          }
          controller.close();
        } catch (error) {
          const client = toClientError(error);
          logger.error("chat_route_error", {
            requestId: streamRequestId,
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
          send({
            type: "error",
            requestId: streamRequestId,
            code: client.code,
            message: client.message,
          });
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: NDJSON_HEADERS });
  } catch (error) {
    return jsonClientError(error, requestId);
  }
}
