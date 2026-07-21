import { NextResponse } from "next/server";
import { brand } from "@/config/brand";
import { getAppRuntime, allowsMocks } from "@/config/runtime";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import { createRequestId } from "@/lib/utils";

export async function GET() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_GIT_COMMIT?.slice(0, 7) ||
    null;

  return NextResponse.json(
    {
      status: "ok",
      service: brand.name,
      runtime: getAppRuntime(),
      version: commit,
      timestamp: new Date().toISOString(),
      requestId: createRequestId(),
      checks: {
        supabasePublicEnv: hasSupabasePublicEnv(),
        mocksAllowed: allowsMocks(),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
