import Link from "next/link";

const LINKS = [
  { href: "/espaco", label: "Memória" },
  { href: "/espaco/oracoes", label: "Orações" },
  { href: "/espaco/diario", label: "Diário" },
  { href: "/espaco/salvos", label: "Salvos" },
] as const;

export function WorkspaceSubnav({ current }: { current?: string }) {
  return (
    <header className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
          Seu espaço
        </p>
        <h1 className="mt-1 font-display text-2xl text-ink">Memória viva</h1>
        <p className="mt-1 text-base leading-relaxed text-ink-soft">
          Íntimo por padrão. Nada disso vai para analytics ou IA.
        </p>
      </div>
      <nav aria-label="Áreas do espaço pessoal" className="flex flex-wrap gap-2">
        {LINKS.map((item) => {
          const active =
            current === item.href ||
            (!current && item.href === "/espaco");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "border-wine/40 bg-wine/[0.08] font-medium text-ink"
                  : "border-border/70 text-ink-soft hover:border-wine/25 hover:text-ink"
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
