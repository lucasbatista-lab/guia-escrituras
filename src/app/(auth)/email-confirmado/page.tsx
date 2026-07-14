import Link from "next/link";
import { redirect } from "next/navigation";
import { EmailConfirmedExperience } from "@/components/auth/email-confirmed-experience";
import { brand } from "@/config/brand";
import { getAuthUserContext } from "@/lib/auth/session";
import { getPlanByKey } from "@/lib/entitlements";
import {
  findLatestActionableIntentByUserId,
  loadSignupIntentByToken,
  readSignupIntentCookie,
} from "@/lib/signup-intents";

export default async function EmailConfirmadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    redirect("/entrar?next=/email-confirmado");
  }

  const params = await searchParams;
  const intentRaw = params.intent;
  const intentFromQuery = Array.isArray(intentRaw) ? intentRaw[0] : intentRaw;
  const cookieIntent = await readSignupIntentCookie();
  const intentToken = intentFromQuery?.trim() || cookieIntent;

  let planName: string | null = null;
  let continueHref = "/planos";
  let hasPlan = false;

  if (intentToken) {
    const record = await loadSignupIntentByToken(intentToken).catch(() => null);
    if (
      record &&
      (!record.userId || record.userId === auth.userId) &&
      record.status !== "expired" &&
      record.status !== "completed"
    ) {
      const plan = getPlanByKey(record.selectedPlanKey);
      planName = plan?.name ?? null;
      hasPlan = true;
      continueHref = `/assinar/continuar?intent=${encodeURIComponent(intentToken)}`;
    }
  }

  if (!hasPlan) {
    const actionable = await findLatestActionableIntentByUserId(auth.userId).catch(
      () => null,
    );
    if (actionable) {
      const plan = getPlanByKey(actionable.selectedPlanKey);
      planName = plan?.name ?? null;
      hasPlan = true;
      continueHref = "/assinar/continuar";
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(198,160,90,0.10),_transparent_50%)]">
      <header className="mx-auto flex w-full max-w-lg items-center px-4 pt-8">
        <Link href="/" className="font-display text-xl text-ink">
          {brand.name}
        </Link>
      </header>
      <main className="mx-auto max-w-lg px-4 py-12">
        <EmailConfirmedExperience
          planName={planName}
          continueHref={continueHref}
          hasPlan={hasPlan}
        />
      </main>
    </div>
  );
}
