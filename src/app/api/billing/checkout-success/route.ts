import { NextResponse } from "next/server";
import { getCheckoutSuccessPollPayload } from "@/lib/billing/checkout-success";

export async function GET() {
  const payload = await getCheckoutSuccessPollPayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
