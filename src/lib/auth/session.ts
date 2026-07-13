import { allowsMocks, requiresRealSupabase } from "@/config/runtime";
import type { PlanKey } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import type { SpiritualProfilePrefs } from "@/lib/theology";
import { AppError } from "@/lib/safety";
import { getEffectiveSubscriptionForUser } from "@/lib/billing/subscription-lookup";

export interface AuthUserContext {
  userId: string;
  email: string | null;
  spiritualProfile: SpiritualProfilePrefs;
  /** Null when the user has no active paid subscription. */
  planKey: PlanKey | null;
  subscriptionStatus: string | null;
  subscriptionPeriodEnd: string | null;
  hasStripeSubscription: boolean;
  hasDuplicateSubscriptions: boolean;
  isAdmin: boolean;
  /** True only when runtime explicitly allows demo/mocks. */
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
  if (!hasSupabasePublicEnv()) {
    if (requiresRealSupabase()) {
      return null;
    }
    if (!allowsMocks()) {
      return null;
    }
    return {
      userId: "demo-user",
      email: "demo@amemchat.local",
      spiritualProfile: DEMO_PROFILE,
      planKey: "caminho",
      subscriptionStatus: "active",
      subscriptionPeriodEnd: null,
      hasStripeSubscription: false,
      hasDuplicateSubscriptions: false,
      isAdmin: true,
      demoMode: true,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    if (allowsMocks()) {
      return {
        userId: "demo-user",
        email: "demo@amemchat.local",
        spiritualProfile: DEMO_PROFILE,
        planKey: "caminho",
        subscriptionStatus: "active",
        subscriptionPeriodEnd: null,
        hasStripeSubscription: false,
        hasDuplicateSubscriptions: false,
        isAdmin: true,
        demoMode: true,
      };
    }
    return null;
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

  const effective = await getEffectiveSubscriptionForUser(user.id);

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
    planKey: effective?.subscription.planKey ?? null,
    subscriptionStatus: effective?.subscription.status ?? null,
    subscriptionPeriodEnd: effective?.subscription.currentPeriodEnd ?? null,
    hasStripeSubscription: Boolean(
      effective?.subscription.stripeSubscriptionId,
    ),
    hasDuplicateSubscriptions: effective?.hasDuplicates ?? false,
    isAdmin: Boolean(adminRole),
    demoMode: false,
  };
}

export async function requireAuthUser(): Promise<AuthUserContext> {
  const ctx = await getAuthUserContext();
  if (!ctx) {
    throw new AppError(
      "unauthenticated",
      "unauthenticated",
      401,
      "Faça login para continuar.",
    );
  }
  return ctx;
}

export async function requireAdminUser(): Promise<AuthUserContext> {
  const ctx = await requireAuthUser();
  if (ctx.demoMode && allowsMocks()) {
    return ctx;
  }
  if (!ctx.isAdmin) {
    throw new AppError(
      "forbidden",
      "forbidden",
      403,
      "Acesso restrito a administradores.",
    );
  }
  return ctx;
}
