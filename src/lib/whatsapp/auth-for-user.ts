import "server-only";

import type { AuthUserContext } from "@/lib/auth";
import { getEffectiveAccessForUser } from "@/lib/billing/access";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SpiritualProfilePrefs } from "@/lib/theology";

const DEFAULT_PROFILE: SpiritualProfilePrefs = {
  traditionKey: "ecumenical",
  denomination: null,
  preferredBibleTranslation: null,
  responseStyle: "reflective",
  preferredDepth: "balanced",
  saintsContentEnabled: false,
  onboardingCompleted: false,
};

/**
 * Load AuthUserContext for a known userId (worker path).
 * Never synthesizes users — returns null if the user cannot be loaded.
 */
export async function loadAuthUserContextForUserId(
  userId: string,
): Promise<AuthUserContext | null> {
  if (!userId) return null;
  try {
    const admin = createAdminClient();
    const [userResult, spiritualResult, access, adminRoleResult] =
      await Promise.all([
        admin.auth.admin.getUserById(userId),
        admin
          .from("spiritual_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        getEffectiveAccessForUser(userId),
        admin
          .from("admin_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

    const user = userResult.data?.user;
    if (!user) return null;

    const spiritual = spiritualResult.data;
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
      : { ...DEFAULT_PROFILE };

    return {
      userId: user.id,
      email: user.email ?? null,
      spiritualProfile,
      planKey: access.planKey,
      subscriptionStatus: access.status,
      subscriptionPeriodEnd: access.currentPeriodEnd,
      hasStripeSubscription: access.accessSource === "stripe",
      hasDuplicateSubscriptions: access.hasDuplicates,
      isAdmin: Boolean(adminRoleResult.data),
      demoMode: false,
    };
  } catch {
    return null;
  }
}
