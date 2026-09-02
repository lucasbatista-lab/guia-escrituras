import Link from "next/link";
import { EmailConfirmNeutralExperience } from "@/components/auth/email-confirm-neutral-experience";
import { EmailConfirmedExperience } from "@/components/auth/email-confirmed-experience";
import { EmailConfirmedWithoutSessionExperience } from "@/components/auth/email-confirmed-without-session-experience";
import { PurchaseJourneySteps } from "@/components/marketing/purchase-journey-steps";
import { brand } from "@/config/brand";
import { consumeEmailConfirmFlash } from "@/lib/auth/email-confirm-flash";
import { maskEmail } from "@/lib/auth/sign-up-errors";
import { getAuthUserContext } from "@/lib/auth/session";
import { getPlanByKey } from "@/lib/entitlements";
import {
  findLatestActionableIntentByUserId,
  loadSignupIntentByToken,
  readSignupIntentCookie,
} from "@/lib/signup-intents";
import { authPrivateMetadata } from "@/lib/seo/auth-metadata";

export const metadata = authPrivateMetadata("E-mail confirmado");

function isOpaqueIntentToken(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.length >= 16 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
}

function buildEmailConfirmadoNext(intentToken: string | null): string {
  if (!intentToken) return "/email-confirmado";
  return `/email-confirmado?intent=${encodeURIComponent(intentToken)}`;
}

function buildPostConfirmLoginHref(intentToken: string | null): string {
  const next = buildEmailConfirmadoNext(intentToken);
  const params = new URLSearchParams({
    next,
    context: "post_confirm",
  });
  return `/entrar?${params.toString()}`;
}

async function resolvePlanFromIntent(intentToken: string | null): Promise<{
  planName: string | null;
  hasPlan: boolean;
  continueHref: string;
}> {
  let planName: string | null = null;
  let hasPlan = false;
  let continueHref = "/planos";

  if (intentToken && isOpaqueIntentToken(intentToken)) {
    const record = await loadSignupIntentByToken(intentToken).catch(() => null);
    if (
      record &&
      record.status !== "expired" &&
      record.status !== "completed" &&
      record.status !== "canceled"
    ) {
      const plan = getPlanByKey(record.selectedPlanKey);
      planName = plan?.name ?? null;
      hasPlan = true;
      if (record.status === "ready_for_checkout") {
        continueHref = `/assinar/continuar?intent=${encodeURIComponent(intentToken)}`;
      } else {
        continueHref = buildPostConfirmLoginHref(intentToken);
      }
    }
  }

  return { planName, hasPlan, continueHref };
}

export default async function EmailConfirmadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const intentRaw = params.intent;
  const intentFromQuery = Array.isArray(intentRaw) ? intentRaw[0] : intentRaw;
  const cookieIntent = await readSignupIntentCookie();
  const intentToken =
    (isOpaqueIntentToken(intentFromQuery?.trim())
      ? intentFromQuery.trim()
      : null) || cookieIntent;

  const auth = await getAuthUserContext();
  const flashConfirmed = await consumeEmailConfirmFlash();

  const shell = (children: React.ReactNode, step: "conta" | "pagamento" = "conta") => (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_5%,rgba(198,160,90,0.18),transparent_32%),radial-gradient(circle_at_95%_85%,rgba(107,46,58,0.08),transparent_34%)]">
      <header className="safe-header-pad mx-auto flex w-full max-w-lg items-center px-4 pt-6 sm:pt-8">
        <Link href="/" className="font-display text-xl text-ink">
          {brand.name}
        </Link>
      </header>
      <main
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto max-w-lg px-4 py-8 outline-none sm:py-12"
      >
        <PurchaseJourneySteps current={step} className="mb-8" />
        {children}
      </main>
    </div>
  );

  if (auth && !auth.demoMode) {
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

    const emailMasked = auth.email ? maskEmail(auth.email) : null;

    return shell(
      <EmailConfirmedExperience
        planName={planName}
        continueHref={continueHref}
        hasPlan={hasPlan}
        emailMasked={emailMasked}
      />,
      hasPlan ? "pagamento" : "conta",
    );
  }

  if (flashConfirmed) {
    const { planName, hasPlan } = await resolvePlanFromIntent(intentToken);
    const loginHref = buildPostConfirmLoginHref(intentToken);

    return shell(
      <EmailConfirmedWithoutSessionExperience
        planName={planName}
        loginHref={loginHref}
        hasPlan={hasPlan}
      />,
      hasPlan ? "pagamento" : "conta",
    );
  }

  return shell(
    <EmailConfirmNeutralExperience supportEmail={brand.supportEmail} />,
    "conta",
  );
}
