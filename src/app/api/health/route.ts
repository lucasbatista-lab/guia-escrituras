import { NextResponse } from "next/server";
import { brand } from "@/config/brand";
import { getAppRuntime, allowsMocks } from "@/config/runtime";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import { isOpenAiConfigured } from "@/lib/ai/gateway";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: brand.name,
    runtime: getAppRuntime(),
    timestamp: new Date().toISOString(),
    checks: {
      supabaseConfigured: hasSupabasePublicEnv(),
      openaiConfigured: isOpenAiConfigured(),
      mocksAllowed: allowsMocks(),
    },
  });
}
