import Link from "next/link";

const LINKS = [
  { href: "/espaco", label: "Memória" },
  { href: "/espaco/oracoes", label: "Orações" },
  { href: "/espaco/diario", label: "Diário" },
  { href: "/espaco/salvos", label: "Salvos" },
] as const;

/** Archive areas — Espaço → Memória → Orações → Diário → Salvos. Keep URLs. */
export function WorkspaceSubnav({ current }: { current?: string }) {
  return (
    <header className="space-y-3">
      <div>
        <p className="text-[11px] font-medium tracking-[0.04em] text-ink-soft">
          Espaço
        </p>
        <h1 className="mt-0.5 font-display text-2xl text-ink">Memória viva</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Íntimo por padrão. Nada disso vai para analytics ou IA.
        </p>
      </div>
      <nav
        aria-label="Áreas do espaço pessoal"
        className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {LINKS.map((item) => {
          const active =
            current === item.href || (!current && item.href === "/espaco");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "bg-wine/[0.08] font-medium text-ink"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
