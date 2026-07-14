export default function Loading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="animate-soft-pulse text-sm text-ink-soft">Carregando…</p>
    </div>
  );
}
