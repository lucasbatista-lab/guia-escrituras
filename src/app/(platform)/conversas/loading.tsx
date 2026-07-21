export default function ConversasLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-40 animate-pulse rounded-md bg-sand-100" />
      <div className="h-24 animate-pulse rounded-2xl bg-sand-100/80" />
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-xl bg-sand-100/70" />
        <div className="h-16 animate-pulse rounded-xl bg-sand-100/70" />
        <div className="h-16 animate-pulse rounded-xl bg-sand-100/70" />
      </div>
      <p className="sr-only">Carregando conversas…</p>
    </div>
  );
}
