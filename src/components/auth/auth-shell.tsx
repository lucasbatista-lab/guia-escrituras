import Link from "next/link";
import { BookOpenText, History, LockKeyhole } from "lucide-react";
import { MAIN_CONTENT_ID } from "@/components/a11y/main-content-id";
import { brand } from "@/config/brand";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-app flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,rgba(198,160,90,0.18),transparent_32%),radial-gradient(circle_at_90%_85%,rgba(107,46,58,0.1),transparent_34%)]"
      />
      <header className="safe-header-pad relative mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-display text-xl text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {brand.name}
        </Link>
      </header>
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 pb-[max(5.5rem,var(--safe-bottom))] outline-none sm:px-6 sm:pb-[max(6rem,var(--safe-bottom))] lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-12 lg:pb-[max(6rem,var(--safe-bottom))]"
      >
        <section className="mx-auto w-full max-w-md rounded-3xl border border-border/70 bg-card/85 p-5 shadow-[0_24px_70px_-42px_rgba(44,36,28,0.65)] backdrop-blur-sm sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
            Sua conta Amém Chat
          </p>
          <h1 className="mt-2 font-display text-3xl text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </section>

        <aside className="hidden lg:block" aria-label="Recursos da sua conta">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
            Continue de onde parou
          </p>
          <h2 className="mt-2 max-w-xl text-balance font-display text-4xl leading-tight text-ink">
            Conversas, Jornadas e histórico na mesma experiência
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-ink-soft">
            Use a mesma conta no celular e no computador, com suas preferências e
            sua assinatura.
          </p>
          <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              { icon: BookOpenText, label: "Referências e aplicação" },
              { icon: History, label: "Continuidade pelo histórico" },
              { icon: LockKeyhole, label: "Conversas não públicas" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border/70 bg-card/60 p-4"
                >
                  <Icon aria-hidden className="size-5 text-wine" />
                  <p className="mt-3 text-sm text-ink">{item.label}</p>
                </div>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}
