export default function AdminLoading() {
  return (
    <div
      className="space-y-5"
      role="status"
      aria-live="polite"
      aria-label="Carregando admin"
    >
      <div className="h-3 w-28 animate-pulse rounded bg-sand-200" />
      <div className="h-9 w-56 max-w-full animate-pulse rounded-md bg-sand-200" />
      <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-sand-100" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="h-16 animate-pulse rounded-xl bg-sand-100" />
        <div className="h-16 animate-pulse rounded-xl bg-sand-100" />
        <div className="h-16 animate-pulse rounded-xl bg-sand-100" />
        <div className="h-16 animate-pulse rounded-xl bg-sand-100" />
      </div>
      <div className="h-28 animate-pulse rounded-2xl bg-sand-100" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
