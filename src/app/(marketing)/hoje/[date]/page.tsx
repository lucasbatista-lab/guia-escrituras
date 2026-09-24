import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import {
  getDailyContentForDate,
  isFutureCalendarDate,
  isIsoCalendarDate,
  publicDailyShareFields,
} from "@/lib/daily";

/**
 * Public editorial permalink / share — no auth, no private user state, no writes.
 * URL contract: /hoje/[date] (distinct from authenticated /hoje?dia= revisit).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!isIsoCalendarDate(date) || isFutureCalendarDate(date)) {
    return { title: brand.name, robots: { index: false, follow: false } };
  }
  const content = getDailyContentForDate(date);
  return {
    title: `${content.scriptureReference} · ${brand.name}`,
    description: content.paraphrase.slice(0, 150),
    robots: { index: false, follow: true },
  };
}

export default async function PublicHojePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isIsoCalendarDate(date)) notFound();
  // Do not expose cycled “future” editorial via URL tampering.
  if (isFutureCalendarDate(date)) {
    notFound();
  }
  const content = getDailyContentForDate(date);
  const share = publicDailyShareFields(content);

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
        Hoje com Deus
      </p>
      <h1 className="mt-2 font-display text-3xl text-ink">{content.title}</h1>
      <p className="mt-2 text-sm text-ink-soft">{date}</p>

      <blockquote className="mt-6 border-l-2 border-wine/30 pl-4">
        <p className="font-display text-xl text-ink">{share.reference}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {share.paraphrase}
        </p>
      </blockquote>

      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
          Reflexão
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {content.reflection}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
          Oração
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{share.prayer}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
          Um passo
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">{share.action}</p>
      </section>

      <p className="mt-8 text-xs text-ink-soft">{share.brand}</p>
    </main>
  );
}
