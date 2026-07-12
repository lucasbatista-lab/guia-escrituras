import { createClient } from "@/lib/supabase/server";
import type { SpiritualProfilePrefs } from "@/lib/theology";
import type { PlanKey } from "@/lib/entitlements";

export interface AuthUserContext {
  userId: string;
  email: string | null;
  spiritualProfile: SpiritualProfilePrefs;
  planKey: PlanKey;
  isAdmin: boolean;
  /** True when running without Supabase (local foundation demo). */
  demoMode: boolean;
}

const DEMO_PROFILE: SpiritualProfilePrefs = {
  traditionKey: "ecumenical",
  denomination: null,
  preferredBibleTranslation: null,
  responseStyle: "reflective",
  preferredDepth: "balanced",
  saintsContentEnabled: false,
  onboardingCompleted: true,
};

export async function getAuthUserContext(): Promise<AuthUserContext | null> {
  const supabase = await createClient();

  if (!supabase) {
    return {
      userId: "demo-user",
      email: "demo@guia-escrituras.local",
      spiritualProfile: DEMO_PROFILE,
      planKey: "caminho",
      isAdmin: true,
      demoMode: true,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: spiritual } = await supabase
    .from("spiritual_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_key, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const spiritualProfile: SpiritualProfilePrefs = spiritual
    ? {
        traditionKey: spiritual.tradition_key,
        denomination: spiritual.denomination,
        preferredBibleTranslation: spiritual.preferred_bible_translation,
        responseStyle: spiritual.response_style,
        preferredDepth: spiritual.preferred_depth,
        saintsContentEnabled: spiritual.saints_content_enabled,
        onboardingCompleted: spiritual.onboarding_completed,
      }
    : {
        ...DEMO_PROFILE,
        onboardingCompleted: false,
      };

  return {
    userId: user.id,
    email: user.email ?? null,
    spiritualProfile,
    planKey: (subscription?.plan_key as PlanKey) ?? "essencial",
    isAdmin: Boolean(adminRole),
    demoMode: false,
  };
}

export async function requireAuthUser(): Promise<AuthUserContext> {
  const ctx = await getAuthUserContext();
  if (!ctx) {
    throw new Error("UNAUTHENTICATED");
  }
  return ctx;
}
