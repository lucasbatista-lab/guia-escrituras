export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg items-center justify-center px-4">
      <p
        className="animate-soft-pulse text-sm text-ink-soft"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        Carregando…
      </p>
    </div>
  );
}
