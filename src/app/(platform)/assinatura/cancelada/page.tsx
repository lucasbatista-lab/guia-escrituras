import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AssinaturaCanceladaPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-3xl text-ink">Pagamento cancelado</h1>
      <p className="mt-3 text-sm text-ink-soft">
        O checkout foi cancelado. Você pode retomar quando quiser escolhendo um plano
        novamente.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Button asChild className="bg-ink hover:bg-ink/90">
          <Link href="/planos">Ver planos</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/conta">Minha conta</Link>
        </Button>
      </div>
    </main>
  );
}
