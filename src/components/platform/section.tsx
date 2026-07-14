import { cn } from "@/lib/utils";

export function PlatformSection({
  title,
  description,
  children,
  className,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-2xl border border-border/70 bg-card/70 p-5 shadow-[0_1px_0_rgba(44,36,28,0.04)] sm:p-6",
        className,
      )}
    >
      <div className="max-w-2xl">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
