import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserContext } from "@/lib/auth";
import {
  DAILY_CHECKIN_VALUES,
  isIsoCalendarDate,
} from "@/lib/daily";
import { upsertDailyInteraction } from "@/lib/daily/interactions";
import { persistProductEvent } from "@/lib/product-events";
import { toClientError } from "@/lib/safety";
import { createRequestId } from "@/lib/utils";
import { saveItem } from "@/lib/workspace/saved";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const bodySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    viewed: z.boolean().optional(),
    completed: z.boolean().optional(),
    saved: z.boolean().optional(),
    shared: z.boolean().optional(),
    checkin: z.enum(DAILY_CHECKIN_VALUES).nullable().optional(),
    eventId: z.string().min(8).max(64).optional(),
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
    if (!parsed.success || !isIsoCalendarDate(parsed.data.date)) {
      return NextResponse.json(
        { code: "invalid_input", message: "Dados inválidos.", requestId },
        { status: 400, headers: NO_STORE },
      );
    }

    const body = parsed.data;
    const interaction = await upsertDailyInteraction(auth.userId, {
      localDate: body.date,
      viewed: body.viewed ?? true,
      completed: body.completed,
      saved: body.saved,
      shared: body.shared,
      checkin: body.checkin,
    });

    if (!interaction) {
      return NextResponse.json(
        {
          code: "persist_failed",
          message: "Não foi possível salvar. Tente de novo.",
          requestId,
        },
        { status: 503, headers: NO_STORE },
      );
    }

    if (body.saved) {
      await saveItem(auth.userId, "daily", body.date).catch(() => null);
    }

    const eventId = body.eventId ?? requestId.replace(/-/g, "").slice(0, 24);
    if (body.completed) {
      await persistProductEvent({
        userId: auth.userId,
        event: "daily_completed",
        eventId: `${eventId}_completed`.slice(0, 64),
        path: "/inicio",
      });
    } else if (body.saved) {
      await persistProductEvent({
        userId: auth.userId,
        event: "daily_saved",
        eventId: `${eventId}_saved`.slice(0, 64),
        path: "/inicio",
      });
    } else if (body.shared) {
      await persistProductEvent({
        userId: auth.userId,
        event: "daily_shared",
        eventId: `${eventId}_shared`.slice(0, 64),
        path: "/inicio",
      });
    } else if (body.checkin) {
      await persistProductEvent({
        userId: auth.userId,
        event: "checkin_completed",
        eventId: `${eventId}_checkin`.slice(0, 64),
        path: "/inicio",
      });
    } else if (body.viewed) {
      await persistProductEvent({
        userId: auth.userId,
        event: "daily_content_viewed",
        eventId: `${eventId}_viewed`.slice(0, 64),
        path: "/inicio",
      });
    }

    return NextResponse.json({ interaction, requestId }, { headers: NO_STORE });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: NO_STORE },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { code: "method_not_allowed", message: "Use POST." },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}
