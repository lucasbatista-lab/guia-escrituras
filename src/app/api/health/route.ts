import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/utils";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "guia-escrituras",
    timestamp: new Date().toISOString(),
    checks: {
      supabaseConfigured: hasSupabaseEnv(),
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    },
    // Never expose keys, connection strings, or secrets
  });
}
