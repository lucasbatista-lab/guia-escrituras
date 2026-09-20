import { NextResponse } from "next/server";
import { createRequestId } from "@/lib/utils";

export const WORKSPACE_NO_STORE = { "Cache-Control": "no-store" } as const;

export function workspaceRequestId(): string {
  return createRequestId();
}

export function workspaceUnauthorized(requestId: string) {
  return NextResponse.json(
    { code: "unauthorized", message: "Faça login para continuar.", requestId },
    { status: 401, headers: WORKSPACE_NO_STORE },
  );
}

export function workspaceInvalid(requestId: string) {
  return NextResponse.json(
    { code: "invalid_input", message: "Dados inválidos.", requestId },
    { status: 400, headers: WORKSPACE_NO_STORE },
  );
}

export function workspaceUnavailable(requestId: string) {
  return NextResponse.json(
    {
      code: "persist_failed",
      message: "Não foi possível salvar. Tente de novo.",
      requestId,
    },
    { status: 503, headers: WORKSPACE_NO_STORE },
  );
}
