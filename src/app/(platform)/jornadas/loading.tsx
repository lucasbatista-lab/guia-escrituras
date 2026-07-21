export default function JornadasLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-md bg-sand-100" />
      <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-sand-100/80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-40 animate-pulse rounded-2xl bg-sand-100/70" />
        <div className="h-40 animate-pulse rounded-2xl bg-sand-100/70" />
        <div className="h-40 animate-pulse rounded-2xl bg-sand-100/70" />
      </div>
      <p className="sr-only">Carregando Jornadas…</p>
    </div>
  );
}
