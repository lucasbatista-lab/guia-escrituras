import { cn } from "@/lib/utils";

/** V17 dusk share card — brass mark only, no orange mass. */
export function PresenceShareCard({
  eyebrow = "Presença",
  quote = "Você esteve presente. Isso basta por hoje.",
  reference,
  className,
}: {
  eyebrow?: string;
  quote?: string;
  reference?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[420px] w-full flex-col items-center justify-center overflow-hidden rounded-[28px] px-9 py-12 text-center text-[#FFFDFC]",
        className,
      )}
      style={{ background: "var(--amem-dusk)" }}
      data-amem-share-card
    >
      <span
        aria-hidden
        className="mb-7 block h-[5px] w-12 rounded-md shadow-[0_8px_20px_rgba(0,0,0,0.22)]"
        style={{
          background: "linear-gradient(90deg, #D4C09A, var(--amem-brass))",
        }}
      />
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[rgba(212,188,140,0.92)]">
        {eyebrow}
      </p>
      <p className="mt-[18px] max-w-[300px] font-display text-[26px] italic leading-snug text-[#FFFDFC]">
        {quote}
      </p>
      {reference ? (
        <p className="mt-[18px] text-[13px] opacity-72">{reference}</p>
      ) : null}
      <p className="mt-12 text-xl font-bold tracking-[-0.02em]">Amém</p>
    </div>
  );
}
