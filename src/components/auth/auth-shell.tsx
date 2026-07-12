import Link from "next/link";
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
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-md px-4 pt-8 sm:px-0">
        <Link href="/" className="font-display text-xl text-ink">
          {brand.name}
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-0">
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
