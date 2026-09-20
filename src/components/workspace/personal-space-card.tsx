import Link from "next/link";
import {
  countMonthlyReflectionMoments,
  monthlyMomentsCopy,
} from "@/lib/workspace/moments";

const LINKS = [
  {
    href: "/espaco/oracoes",
    label: "Orações",
    description: "Pedidos que você guarda em silêncio",
  },
  {
    href: "/espaco/salvos",
    label: "Salvos",
    description: "O que você quis guardar de hoje",
  },
  {
    href: "/espaco/diario",
    label: "Diário",
    description: "Reflexão e gratidão, só suas",
  },
] as const;

export async function PersonalSpaceCard({ userId }: { userId: string }) {
  const count = await countMonthlyReflectionMoments(userId);
  const moments = monthlyMomentsCopy(count);

  return (
    <section
      aria-labelledby="personal-space-heading"
      className="rounded-3xl border border-border/70 bg-card/70 p-5"
    >
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold">
        Seu espaço
      </p>
      <h2 id="personal-space-heading" className="mt-1 font-display text-xl text-ink">
        Guarde o que é seu
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        Orações, salvos e anotações ficam privados. Nada disso vai para o chat
        nem para estatísticas.
      </p>
      {moments ? (
        <p className="mt-3 text-sm text-ink">{moments}</p>
      ) : null}
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-[4.75rem] flex-col justify-between rounded-2xl border border-border/70 bg-background/60 p-3 transition hover:border-wine/25 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-sm font-medium text-ink">{item.label}</span>
              <span className="text-xs leading-tight text-ink-soft">
                {item.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
