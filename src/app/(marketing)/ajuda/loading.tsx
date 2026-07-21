export default function AjudaLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12" aria-busy="true">
      <div className="h-9 w-56 animate-pulse rounded-md bg-sand-100" />
      <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-sand-100/80" />
      <div className="space-y-3 pt-4">
        <div className="h-20 animate-pulse rounded-xl bg-sand-100/70" />
        <div className="h-20 animate-pulse rounded-xl bg-sand-100/70" />
        <div className="h-20 animate-pulse rounded-xl bg-sand-100/70" />
      </div>
      <p className="sr-only">Carregando ajuda…</p>
    </div>
  );
}
