import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/inicio";

  if (token_hash && type) {
    const supabase = await createClient();
    if (supabase) {
      await supabase.auth.verifyOtp({
        type: type as "email",
        token_hash,
      });
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
