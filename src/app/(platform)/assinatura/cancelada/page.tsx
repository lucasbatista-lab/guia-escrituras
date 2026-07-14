import Link from "next/link";
import { FocusPageTitle } from "@/components/a11y/focus-page-title";
import { Button } from "@/components/ui/button";

export default function AssinaturaCanceladaPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <FocusPageTitle className="font-display text-3xl text-ink">
        Pagamento cancelado
      </FocusPageTitle>
      <p className="mt-3 text-sm text-ink-soft" role="status" aria-live="polite">
        O checkout foi cancelado. Você pode retomar quando quiser escolhendo um
        plano novamente.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Button asChild className="min-h-11 bg-ink hover:bg-ink/90">
          <Link href="/planos">Ver planos</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/conta">Minha conta</Link>
        </Button>
      </div>
    </main>
  );
}
