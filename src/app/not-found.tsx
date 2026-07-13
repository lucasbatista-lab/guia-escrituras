import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="font-display text-3xl text-ink">Página não encontrada</h1>
      <p className="mt-3 text-sm text-ink-soft">
        O endereço solicitado não existe ou você não tem permissão para vê-lo.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex w-fit rounded-md bg-ink px-4 py-2 text-sm text-sand-50"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
