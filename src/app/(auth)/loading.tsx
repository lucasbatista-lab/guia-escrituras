export default function AuthLoading() {
  return (
    <div
      className="mx-auto flex min-h-[40vh] max-w-md flex-col justify-center space-y-3 px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando"
    >
      <div className="h-8 w-40 animate-pulse rounded-md bg-sand-200" />
      <div className="h-4 w-full animate-pulse rounded-md bg-sand-100" />
      <div className="h-4 w-3/4 animate-pulse rounded-md bg-sand-100" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
