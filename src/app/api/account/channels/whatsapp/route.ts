import { NextResponse } from "next/server";
import { getAuthUserContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRequestId } from "@/lib/utils";
import {
  createWhatsAppLinkCode,
  getWhatsAppLinkTokenSecret,
} from "@/lib/whatsapp/link-tokens";
import { evaluateWhatsAppLinkCodeRateLimit } from "@/lib/whatsapp/link-rate-limit";
import {
  getActiveWhatsAppIdentityForUser,
  revokeWhatsAppIdentityForUser,
} from "@/lib/whatsapp/identity";
import { logWhatsAppOps } from "@/lib/whatsapp/ops-log";

export const runtime = "nodejs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost = new URL(request.url).host;
    return originHost === requestHost;
  } catch {
    return false;
  }
}

function methodNotAllowed(allow: string) {
  return NextResponse.json(
    { code: "method_not_allowed", message: "Método não permitido." },
    { status: 405, headers: { Allow: allow, ...PRIVATE_HEADERS } },
  );
}

async function pendingCodeExpiresAt(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("channel_identity_link_tokens")
      .select("expires_at")
      .eq("user_id", userId)
      .eq("channel", "whatsapp")
      .is("consumed_at", null)
      .is("invalidated_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.expires_at as string | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * GET — WhatsApp link status for the authenticated session only.
 * Never returns external_id, code, hash, or phone.
 */
export async function GET() {
  const requestId = createRequestId();
  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    return NextResponse.json(
      { code: "unauthenticated", message: "Faça login para continuar.", requestId },
      { status: 401, headers: { ...PRIVATE_HEADERS } },
    );
  }

  const identity = await getActiveWhatsAppIdentityForUser(auth.userId);
  const pendingExpires = identity
    ? null
    : await pendingCodeExpiresAt(auth.userId);

  return NextResponse.json(
    {
      linked: Boolean(identity),
      status: identity ? "active" : "unlinked",
      verifiedAt: identity?.verifiedAt ?? null,
      pendingCodeExpiresAt: pendingExpires,
      requestId,
    },
    { status: 200, headers: { ...PRIVATE_HEADERS } },
  );
}

/**
 * POST — generate a single-use link code (plaintext returned once).
 */
export async function POST(request: Request) {
  const requestId = createRequestId();

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { code: "forbidden", message: "Origem inválida.", requestId },
      { status: 403, headers: { ...PRIVATE_HEADERS } },
    );
  }

  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    return NextResponse.json(
      { code: "unauthenticated", message: "Faça login para continuar.", requestId },
      { status: 401, headers: { ...PRIVATE_HEADERS } },
    );
  }

  if (!getWhatsAppLinkTokenSecret()) {
    return NextResponse.json(
      {
        code: "misconfigured",
        message: "Vinculação indisponível no momento.",
        requestId,
      },
      { status: 503, headers: { ...PRIVATE_HEADERS } },
    );
  }

  const rate = evaluateWhatsAppLinkCodeRateLimit(auth.userId);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        code: "rate_limited",
        message: "Aguarde antes de gerar outro código.",
        requestId,
      },
      {
        status: 429,
        headers: {
          ...PRIVATE_HEADERS,
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  const existing = await getActiveWhatsAppIdentityForUser(auth.userId);
  if (existing) {
    return NextResponse.json(
      {
        code: "already_linked",
        message: "Seu WhatsApp já está vinculado.",
        requestId,
      },
      { status: 409, headers: { ...PRIVATE_HEADERS } },
    );
  }

  const created = await createWhatsAppLinkCode({ userId: auth.userId });
  if (!created.ok) {
    return NextResponse.json(
      {
        code: "generation_failed",
        message: "Não foi possível gerar o código.",
        requestId,
      },
      { status: 500, headers: { ...PRIVATE_HEADERS } },
    );
  }

  return NextResponse.json(
    {
      code: created.code,
      expiresAt: created.expiresAt,
      instruction:
        "Envie no WhatsApp a mensagem: VINCULAR <CÓDIGO> (substitua pelo código recebido).",
      requestId,
    },
    { status: 200, headers: { ...PRIVATE_HEADERS } },
  );
}

/**
 * DELETE — revoke active WhatsApp identity for the session user.
 */
export async function DELETE(request: Request) {
  const requestId = createRequestId();

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { code: "forbidden", message: "Origem inválida.", requestId },
      { status: 403, headers: { ...PRIVATE_HEADERS } },
    );
  }

  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    return NextResponse.json(
      { code: "unauthenticated", message: "Faça login para continuar.", requestId },
      { status: 401, headers: { ...PRIVATE_HEADERS } },
    );
  }

  const result = await revokeWhatsAppIdentityForUser(auth.userId);
  if (result.revoked) {
    logWhatsAppOps("identity_revoked", {
      eventIdPrefix: (result.identityId ?? "unknown").slice(0, 8),
    });
  }

  return NextResponse.json(
    {
      linked: false,
      status: "revoked",
      revoked: true,
      requestId,
    },
    { status: 200, headers: { ...PRIVATE_HEADERS } },
  );
}

export async function PUT() {
  return methodNotAllowed("GET, POST, DELETE");
}

export async function PATCH() {
  return methodNotAllowed("GET, POST, DELETE");
}
