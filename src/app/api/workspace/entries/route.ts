import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserContext } from "@/lib/auth";
import { persistProductEvent } from "@/lib/product-events";
import { toClientError } from "@/lib/safety";
import {
  createPrivateEntry,
  deletePrivateEntry,
  listPrivateEntries,
  updatePrivateEntry,
} from "@/lib/workspace/entries";
import { JOURNAL_MAX_LEN } from "@/lib/workspace/types";
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
    kind: z.enum(["journal", "gratitude", "journey_step"]),
    body: z.string().trim().min(1).max(JOURNAL_MAX_LEN),
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    journeySlug: z.string().trim().min(1).max(80).optional(),
    stepId: z.string().trim().min(1).max(80).optional(),
    eventId: z.string().min(8).max(64).optional(),
  })
  .strict();

const patchSchema = z
  .object({
    id: z.string().uuid(),
    body: z.string().trim().min(1).max(JOURNAL_MAX_LEN),
  })
  .strict();

const deleteSchema = z.object({ id: z.string().uuid() }).strict();

export async function GET() {
  const requestId = workspaceRequestId();
  try {
    const auth = await getAuthUserContext();
    if (!auth) return workspaceUnauthorized(requestId);
    const entries = await listPrivateEntries(auth.userId);
    return NextResponse.json({ entries, requestId }, { headers: WORKSPACE_NO_STORE });
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

    const entry = await createPrivateEntry({
      userId: auth.userId,
      kind: parsed.data.kind,
      body: parsed.data.body,
      localDate: parsed.data.localDate,
      journeySlug: parsed.data.journeySlug,
      stepId: parsed.data.stepId,
    });
    if (!entry) return workspaceUnavailable(requestId);

    if (parsed.data.kind === "journal" || parsed.data.kind === "gratitude") {
      await persistProductEvent({
        userId: auth.userId,
        event: "journal_created",
        eventId: (parsed.data.eventId ?? requestId.replace(/-/g, "")).slice(0, 64),
        path: "/espaco/diario",
      });
    }

    return NextResponse.json({ entry, requestId }, { headers: WORKSPACE_NO_STORE });
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
    const entry = await updatePrivateEntry(
      auth.userId,
      parsed.data.id,
      parsed.data.body,
    );
    if (!entry) return workspaceUnavailable(requestId);
    return NextResponse.json({ entry, requestId }, { headers: WORKSPACE_NO_STORE });
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
    const ok = await deletePrivateEntry(auth.userId, parsed.data.id);
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
