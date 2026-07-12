import { NextResponse } from "next/server";
import { getAuthUserContext } from "@/lib/auth";
import { getBudgetConfig, usageLevelLabel } from "@/lib/usage";
import { createRequestId } from "@/lib/utils";

export async function GET() {
  const requestId = createRequestId();
  const auth = await getAuthUserContext();

  if (!auth) {
    return NextResponse.json(
      { code: "unauthenticated", message: "Faça login.", requestId },
      { status: 401 },
    );
  }

  const config = getBudgetConfig(auth.planKey);

  return NextResponse.json({
    requestId,
    planKey: auth.planKey,
    level: "normal",
    label: usageLevelLabel("normal"),
    dailyBurstLimit: config.dailyBurstLimit,
    // Friendly — no raw message quotas
    note: "Uso apresentado em linguagem amigável na conta do usuário.",
  });
}
