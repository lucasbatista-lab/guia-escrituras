import { NextResponse } from "next/server";
import { createCustomerPortalSession } from "@/lib/stripe/portal";

export async function POST() {
  const result = await createCustomerPortalSession();
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      {
        status:
          result.code === "unauthenticated"
            ? 401
            : result.code === "no_customer"
              ? 404
              : 503,
      },
    );
  }
  return NextResponse.json({ url: result.url });
}
