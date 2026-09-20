import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserContext } from "@/lib/auth";
import { persistProductEvent } from "@/lib/product-events";
import { toClientError } from "@/lib/safety";
import { listSavedItems, saveItem } from "@/lib/workspace/saved";
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
    itemType: z.enum(["daily", "journey_step", "editorial_prayer", "passage"]),
    itemKey: z.string().trim().min(1).max(80),
    eventId: z.string().min(8).max(64).optional(),
  })
  .strict();

export async function GET() {
  const requestId = workspaceRequestId();
  try {
    const auth = await getAuthUserContext();
    if (!auth) return workspaceUnauthorized(requestId);
    const items = await listSavedItems(auth.userId);
    return NextResponse.json({ items, requestId }, { headers: WORKSPACE_NO_STORE });
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

    const item = await saveItem(
      auth.userId,
      parsed.data.itemType,
      parsed.data.itemKey,
    );
    if (!item) return workspaceUnavailable(requestId);

    await persistProductEvent({
      userId: auth.userId,
      event: "favorite_created",
      eventId: (parsed.data.eventId ?? requestId.replace(/-/g, "")).slice(0, 64),
      path: "/espaco/salvos",
    });

    return NextResponse.json({ item, requestId }, { headers: WORKSPACE_NO_STORE });
  } catch (error) {
    const client = toClientError(error);
    return NextResponse.json(
      { code: client.code, message: client.message, requestId },
      { status: client.status, headers: WORKSPACE_NO_STORE },
    );
  }
}
