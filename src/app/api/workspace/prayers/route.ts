import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserContext } from "@/lib/auth";
import { persistProductEvent } from "@/lib/product-events";
import { toClientError } from "@/lib/safety";
import {
  createPrayer,
  deletePrayer,
  listPrayers,
  updatePrayer,
} from "@/lib/workspace/prayers";
import { PRAYER_MAX_LEN } from "@/lib/workspace/types";
import {
  WORKSPACE_NO_STORE,
  workspaceInvalid,
  workspaceRequestId,
  workspaceUnauthorized,
  workspaceUnavailable,
} from "@/lib/workspace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z
  .object({
    body: z.string().trim().min(1).max(PRAYER_MAX_LEN),
    eventId: z.string().min(8).max(64).optional(),
  })
  .strict();

const patchSchema = z
  .object({
    id: z.string().uuid(),
    body: z.string().trim().min(1).max(PRAYER_MAX_LEN).optional(),
    status: z.enum(["open", "answered"]).optional(),
    eventId: z.string().min(8).max(64).optional(),
  })
  .strict();

const deleteSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export async function GET() {
  const requestId = workspaceRequestId();
  try {
    const auth = await getAuthUserContext();
    if (!auth) return workspaceUnauthorized(requestId);
    const prayers = await listPrayers(auth.userId);
    return NextResponse.json({ prayers, requestId }, { headers: WORKSPACE_NO_STORE });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: WORKSPACE_NO_STORE },
    );
  }
}

export async function POST(request: Request) {
  const requestId = workspaceRequestId();
  try {
    const auth = await getAuthUserContext();
    if (!auth) return workspaceUnauthorized(requestId);
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return workspaceInvalid(requestId);

    const prayer = await createPrayer(auth.userId, parsed.data.body);
    if (!prayer) return workspaceUnavailable(requestId);

    await persistProductEvent({
      userId: auth.userId,
      event: "prayer_created",
      eventId: (parsed.data.eventId ?? requestId.replace(/-/g, "")).slice(0, 64),
      path: "/espaco/oracoes",
    });

    return NextResponse.json({ prayer, requestId }, { headers: WORKSPACE_NO_STORE });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: WORKSPACE_NO_STORE },
    );
  }
}

export async function PATCH(request: Request) {
  const requestId = workspaceRequestId();
  try {
    const auth = await getAuthUserContext();
    if (!auth) return workspaceUnauthorized(requestId);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return workspaceInvalid(requestId);

    const prayer = await updatePrayer(auth.userId, parsed.data.id, {
      body: parsed.data.body,
      status: parsed.data.status,
    });
    if (!prayer) return workspaceUnavailable(requestId);

    if (parsed.data.status === "answered") {
      await persistProductEvent({
        userId: auth.userId,
        event: "prayer_marked_answered",
        eventId: (parsed.data.eventId ?? requestId.replace(/-/g, "")).slice(0, 64),
        path: "/espaco/oracoes",
      });
    }

    return NextResponse.json({ prayer, requestId }, { headers: WORKSPACE_NO_STORE });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: WORKSPACE_NO_STORE },
    );
  }
}

export async function DELETE(request: Request) {
  const requestId = workspaceRequestId();
  try {
    const auth = await getAuthUserContext();
    if (!auth) return workspaceUnauthorized(requestId);
    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return workspaceInvalid(requestId);
    const ok = await deletePrayer(auth.userId, parsed.data.id);
    if (!ok) return workspaceUnavailable(requestId);
    return NextResponse.json({ ok: true, requestId }, { headers: WORKSPACE_NO_STORE });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: WORKSPACE_NO_STORE },
    );
  }
}
