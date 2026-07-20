import Link from "next/link";
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
    <div className="flex min-h-app flex-col">
      <header className="safe-header-pad mx-auto w-full max-w-md px-4 pt-8 sm:px-0 sm:pt-8">
        <Link
          href="/"
          className="font-display text-xl text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {brand.name}
        </Link>
      </header>
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 outline-none sm:px-0"
      >
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
