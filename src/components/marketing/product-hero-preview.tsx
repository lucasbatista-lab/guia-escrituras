import { BookOpen, ChevronRight, LockKeyhole, Sparkles } from "lucide-react";

export function ProductHeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[22rem] lg:max-w-[25rem]">
      <div
        aria-hidden
        className="absolute -inset-5 rounded-[3rem] bg-[radial-gradient(circle_at_50%_35%,rgba(198,160,90,0.3),transparent_62%)] blur-2xl"
      />
      <div className="relative overflow-hidden rounded-[2rem] border border-ink/15 bg-ink p-1.5 shadow-[0_28px_70px_-30px_rgba(44,36,28,0.55)]">
        <div className="overflow-hidden rounded-[1.65rem] bg-sand-50">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-wine text-sand-50">
                <Sparkles aria-hidden className="size-4" />
              </span>
              <div>
                <p className="font-display text-sm leading-none text-ink">Amém Chat</p>
                <p className="mt-1 text-[10px] text-ink-soft">Reflexão em andamento</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-ink-soft">
              <LockKeyhole aria-hidden className="size-3" />
              privada
            </span>
          </div>

          <div className="space-y-3 px-3.5 py-4 font-chat text-[13px] leading-relaxed sm:px-4">
            <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2.5 text-sand-50">
              Estou ansiosa com uma decisão e não consigo organizar o que sinto.
            </div>
            <div className="max-w-[94%] rounded-2xl rounded-bl-sm border border-border/70 bg-white/80 px-3.5 py-3 text-ink shadow-sm">
              <p>
                Você não precisa fingir certeza. Podemos separar o que é medo,
                responsabilidade e o próximo passo possível.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-1 font-sans text-[10px] text-ink-soft">
                  <BookOpen aria-hidden className="size-3" />
                  Tiago 1:5
                </span>
                <span className="rounded-full bg-sand-100 px-2 py-1 font-sans text-[10px] text-ink-soft">
                  Provérbios 3:5–6
                </span>
              </div>
              <div className="mt-2.5 border-t border-border/60 pt-2.5 font-sans text-[11px] text-ink-soft">
                <p className="font-medium text-ink">Próximo passo</p>
                <p className="mt-0.5">Nomeie o que precisa ser decidido esta semana.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-border/70 bg-card/80 px-2 py-2">
            {["Conversar", "Jornadas", "Histórico"].map((item, index) => (
              <span
                key={item}
                className={`flex items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] ${
                  index === 0 ? "bg-wine/[0.08] font-medium text-wine" : "text-ink-soft"
                }`}
              >
                {item}
                {index === 0 ? <ChevronRight aria-hidden className="size-3" /> : null}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] tracking-wide text-ink-soft">
        Exemplo ilustrativo fiel à experiência do produto
      </p>
    </div>
  );
}
