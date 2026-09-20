import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserContext } from "@/lib/auth";
import {
  persistProductEvent,
  PRODUCT_EVENT_NAMES,
  sanitizeProductEventPath,
} from "@/lib/product-events";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const bodySchema = z
  .object({
    event: z.enum(PRODUCT_EVENT_NAMES),
    event_id: z.string().min(8).max(64),
    path: z.string().max(80),
  })
  .strict();

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const auth = await getAuthUserContext();
    if (!auth) {
      return NextResponse.json(
        { code: "unauthorized", message: "Faça login para continuar.", requestId },
        { status: 401, headers: NO_STORE },
      );
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, requestId },
        { status: 400, headers: NO_STORE },
      );
    }

    const path = sanitizeProductEventPath(parsed.data.path);
    if (!path) {
      return NextResponse.json(
        { ok: false, requestId },
        { status: 400, headers: NO_STORE },
      );
    }

    const result = await persistProductEvent({
      userId: auth.userId,
      event: parsed.data.event,
      eventId: parsed.data.event_id,
      path,
    });

    return NextResponse.json(
      { ok: true, stored: result.stored, requestId },
      { status: 202, headers: NO_STORE },
    );
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { ok: false, code: client.code, requestId },
      { status: client.status, headers: NO_STORE },
    );
  }
}
