import { NextResponse } from "next/server";
import { getAuthUserContext } from "@/lib/auth";
import { getBudgetConfig, usageLevelLabel } from "@/lib/usage";
import { createRequestId } from "@/lib/utils";

const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store",
} as const;

export async function GET() {
  const requestId = createRequestId();
  const auth = await getAuthUserContext();

  if (!auth) {
    return NextResponse.json(
      { code: "unauthenticated", message: "Faça login.", requestId },
      { status: 401, headers: PRIVATE_NO_STORE },
    );
  }

  if (!auth.planKey) {
    return NextResponse.json(
      {
        requestId,
        planKey: null,
        level: "normal",
        label: "Sem assinatura",
        note: "Não há plano gratuito. Assine para conversar.",
      },
      { headers: PRIVATE_NO_STORE },
    );
  }

  const config = getBudgetConfig(auth.planKey);

  return NextResponse.json(
    {
      requestId,
      planKey: auth.planKey,
      level: "normal",
      label: usageLevelLabel("normal"),
      dailyBurstLimit: config.dailyBurstLimit,
      note: "Uso apresentado em linguagem amigável na conta do usuário.",
    },
    { headers: PRIVATE_NO_STORE },
  );
}
