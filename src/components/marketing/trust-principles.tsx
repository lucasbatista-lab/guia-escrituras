import { EyeOff, LockKeyhole, MegaphoneOff, ShieldCheck } from "lucide-react";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { cn } from "@/lib/utils";

const principles = [
  {
    icon: MegaphoneOff,
    title: "Sem anúncios",
    body: "Sua atenção não é o produto.",
  },
  {
    icon: EyeOff,
    title: "Conversas não são públicas",
    body: "O diálogo fica na sua conta.",
  },
  {
    icon: ShieldCheck,
    title: "Dados não são vendidos",
    body: "Prestadores essenciais processam apenas o necessário para operar.",
  },
  {
    icon: LockKeyhole,
    title: "Limites claros da IA",
    body: "Não é voz divina nem substitui cuidado profissional.",
  },
] as const;

export function TrustPrinciples({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-wine/15 bg-ink px-5 py-7 text-sand-50 sm:px-7",
        className,
      )}
      aria-labelledby="trust-principles-heading"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold-soft">
          Privacidade e honestidade
        </p>
        <h2 id="trust-principles-heading" className="mt-2 font-display text-2xl">
          Um espaço para refletir, não para explorar sua vulnerabilidade
        </h2>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {principles.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl bg-sand-50/[0.07] p-4">
              <Icon aria-hidden className="size-5 text-gold-soft" />
              <h3 className="mt-3 text-sm font-medium text-sand-50">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-sand-200">{item.body}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-sand-200">
        Veja como autenticação, pagamentos e processamento de IA funcionam na{" "}
        <TrackingLink
          href="/privacidade"
          className="text-sand-50 underline underline-offset-4"
        >
          Política de Privacidade
        </TrackingLink>{" "}
        e em{" "}
        <TrackingLink
          href="/transparencia-ia"
          className="text-sand-50 underline underline-offset-4"
        >
          Transparência sobre IA
        </TrackingLink>
        .
      </p>
    </section>
  );
}
