import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";

/**
 * Minimal DB health probe. Returns only status + latency.
 * Never expose URL, SQL, table names, or internal errors.
 */
export async function GET() {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json(
      { status: "unavailable", latencyMs: null },
      { status: 503 },
    );
  }

  const started = Date.now();

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { status: "unavailable", latencyMs: null },
        { status: 503 },
      );
    }

    const { error } = await supabase.from("plans").select("key").limit(1);
    const latencyMs = Date.now() - started;

    if (error) {
      return NextResponse.json(
        { status: "unavailable", latencyMs },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "ok", latencyMs });
  } catch {
    return NextResponse.json(
      { status: "unavailable", latencyMs: Date.now() - started },
      { status: 503 },
    );
  }
}
