import Link from "next/link";
import { PlatformPageHeader } from "@/components/platform/page-header";

const LINKS = [
  { href: "/espaco/oracoes", label: "Orações" },
  { href: "/espaco/salvos", label: "Salvos" },
  { href: "/espaco/diario", label: "Diário" },
] as const;

export function WorkspaceSubnav({ current }: { current?: string }) {
  return (
    <>
      <PlatformPageHeader
        eyebrow="Seu espaço"
        title="Privado por padrão"
        description="Orações, salvos e diário ficam só na sua conta. Nada disso vai para IA."
      />
      <nav aria-label="Áreas do espaço pessoal" className="flex flex-wrap gap-2">
        {LINKS.map((item) => {
          const active = current === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm ${
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
    </>
  );
}
