export default function AdminLoading() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-label="Carregando admin"
    >
      <div className="h-8 w-48 animate-pulse rounded-md bg-sand-200" />
      <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-sand-100" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-xl bg-sand-100" />
        <div className="h-24 animate-pulse rounded-xl bg-sand-100" />
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
