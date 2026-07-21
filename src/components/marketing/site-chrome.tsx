"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { brand } from "@/config/brand";
import { LEGAL_ROUTES } from "@/config/legal";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { cn } from "@/lib/utils";

const links = [
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/planos", label: "Planos" },
  { href: "/mensagens-personalizadas", label: "Mensagens" },
];

export function SiteHeader({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "mx-auto w-full max-w-6xl px-4 pb-5 pt-safe sm:px-6",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 pt-5">
        <TrackingLink href="/" className="group min-h-11 py-1">
          <span className="font-display text-xl tracking-tight text-ink sm:text-2xl">
            {brand.name}
          </span>
          <span className="mt-0.5 block text-[11px] uppercase tracking-[0.18em] text-ink-soft/80 transition group-hover:text-wine">
            {brand.description}
          </span>
        </TrackingLink>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Principal">
          {links.map((link) => (
            <TrackingLink
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center text-sm text-ink-soft transition hover:text-ink"
            >
              {link.label}
            </TrackingLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <TrackingLink
            href="/entrar"
            className="hidden min-h-11 items-center text-sm text-ink-soft transition hover:text-ink sm:inline-flex"
          >
            Entrar
          </TrackingLink>
          <TrackingLink
            href="/cadastro"
            className="inline-flex min-h-11 items-center rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-sand-50 transition hover:bg-ink/90"
          >
            Criar conta
          </TrackingLink>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border/80 text-ink md:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-expanded={open}
            aria-controls="marketing-mobile-nav"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-4 bg-ink" />
              <span className="block h-0.5 w-4 bg-ink" />
              <span className="block h-0.5 w-4 bg-ink" />
            </span>
          </button>
        </div>
      </div>
      {open ? (
        <nav
          id="marketing-mobile-nav"
          className="mt-4 flex flex-col border-t border-border/60 pt-2 md:hidden"
          aria-label="Menu mobile"
        >
          {links.map((link) => (
            <TrackingLink
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center text-sm text-ink"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </TrackingLink>
          ))}
          <TrackingLink
            href="/entrar"
            className="flex min-h-11 items-center text-sm text-ink-soft"
            onClick={() => setOpen(false)}
          >
            Entrar
          </TrackingLink>
        </nav>
      ) : null}
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
            <TrackingLink href="/planos" className="hover:text-ink">
              Planos
            </TrackingLink>
            <TrackingLink href="/ajuda" className="min-h-11 inline-flex items-center hover:text-ink">
              Ajuda
            </TrackingLink>
            <TrackingLink href="/como-funciona" className="hover:text-ink">
              Como funciona
            </TrackingLink>
            <a
              href={`https://instagram.com/${brand.socialHandles.instagram}`}
              className="hover:text-ink"
              rel="noopener noreferrer"
              target="_blank"
            >
              @{brand.socialHandles.instagram}
            </a>
            <TrackingLink href="/cadastro" className="hover:text-ink">
              Cadastro
            </TrackingLink>
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
