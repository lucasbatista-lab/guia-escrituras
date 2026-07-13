import Link from "next/link";
import { brand } from "@/config/brand";
import { LEGAL_ROUTES } from "@/config/legal";
import { cn } from "@/lib/utils";

const links = [
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/planos", label: "Planos" },
  { href: "/mensagens-personalizadas", label: "Mensagens" },
];

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6",
        className,
      )}
    >
      <Link href="/" className="group">
        <span className="font-display text-xl tracking-tight text-ink sm:text-2xl">
          {brand.name}
        </span>
        <span className="mt-0.5 block text-[11px] uppercase tracking-[0.18em] text-ink-soft/80 transition group-hover:text-wine">
          {brand.description}
        </span>
      </Link>
      <nav className="hidden items-center gap-6 md:flex" aria-label="Principal">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-ink-soft transition hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/entrar"
          className="hidden text-sm text-ink-soft transition hover:text-ink sm:inline"
        >
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className="rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-sand-50 transition hover:bg-ink/90"
        >
          Criar conta
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-20 w-full max-w-6xl border-t border-border/70 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-lg text-ink">{brand.name}</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            {brand.description} Experiência de inteligência artificial baseada
            nas Escrituras — não afirma ser Jesus, Deus ou uma manifestação
            sobrenatural.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm text-ink-soft">
          <div className="flex flex-wrap gap-4">
            <Link href="/planos" className="hover:text-ink">
              Planos
            </Link>
            <Link href="/como-funciona" className="hover:text-ink">
              Como funciona
            </Link>
            <a
              href={`https://instagram.com/${brand.socialHandles.instagram}`}
              className="hover:text-ink"
              rel="noopener noreferrer"
              target="_blank"
            >
              @{brand.socialHandles.instagram}
            </a>
            <Link href="/cadastro" className="hover:text-ink">
              Cadastro
            </Link>
          </div>
          <nav aria-label="Documentos legais" className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGAL_ROUTES.map((route) => (
              <Link key={route.href} href={route.href} className="hover:text-ink">
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
