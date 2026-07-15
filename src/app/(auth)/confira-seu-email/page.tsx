import Link from "next/link";
import { CheckEmailExperience } from "@/components/auth/check-email-experience";
import { brand } from "@/config/brand";
import { getPlanByKey } from "@/lib/entitlements";
import { isCheckoutPlanKey, validateCheckoutPlan } from "@/lib/signup-intents";

export default async function ConfiraSeuEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hintRaw = params.hint;
  const planRaw = params.plan;
  const modeRaw = params.mode;
  const emailHint = Array.isArray(hintRaw) ? hintRaw[0] : hintRaw;
  const planParam = Array.isArray(planRaw) ? planRaw[0] : planRaw;
  const modeParam = Array.isArray(modeRaw) ? modeRaw[0] : modeRaw;
  const mode = modeParam === "recovery" ? "recovery" : "signup";

  const planKey =
    planParam && isCheckoutPlanKey(planParam)
      ? validateCheckoutPlan(planParam).ok
        ? planParam
        : null
      : null;
  const plan = planKey ? getPlanByKey(planKey) : null;

  const correctHref =
    mode === "recovery"
      ? "/recuperar-senha"
      : planKey
        ? `/cadastro?plan=${planKey}`
        : "/cadastro";

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(198,160,90,0.10),_transparent_50%)]">
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pt-8">
        <Link href="/" className="font-display text-xl text-ink">
          {brand.name}
        </Link>
        <Link
          href={correctHref}
          className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          Corrigir e-mail
        </Link>
      </header>
      <main className="mx-auto max-w-lg px-4 py-12">
        <CheckEmailExperience
          emailHint={emailHint?.trim() || null}
          planName={plan?.name ?? null}
          planKey={planKey}
          mode={mode}
          supportEmail={brand.supportEmail}
        />
      </main>
    </div>
  );
}
