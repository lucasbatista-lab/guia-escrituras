import Link from "next/link";

export default function JornadaPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl text-ink">Em breve</h1>
      <p className="mt-3 text-ink-soft">
        As jornadas de leitura guiadas ainda não estão disponíveis. Enquanto
        isso, você pode refletir nas Escrituras pela conversa.
      </p>
      <p className="mt-6">
        <Link href="/inicio" className="text-sm underline underline-offset-4">
          Voltar ao início
        </Link>
      </p>
    </div>
  );
}
