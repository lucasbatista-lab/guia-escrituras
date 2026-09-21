import { JourneyCoverArt } from "@/components/journeys/covers/journey-cover-art";

/**
 * Illustrative product frame for ATF — mirrors real surfaces (Hoje / Caminho / Espaço),
 * not a fake chat-only mock of an older product.
 */
export function ProductHeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[22rem] lg:max-w-[25rem]">
      <div
        aria-hidden
        className="absolute -inset-5 rounded-[3rem] bg-[radial-gradient(circle_at_50%_35%,rgba(198,160,90,0.3),transparent_62%)] blur-2xl"
      />
      <div className="relative overflow-hidden rounded-[2rem] border border-ink/15 bg-ink p-1.5 shadow-[0_28px_70px_-30px_rgba(44,36,28,0.55)]">
        <div className="overflow-hidden rounded-[1.65rem] bg-[#F7F5F1]">
          {/* Phone chrome */}
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <p className="font-sans text-[11px] font-semibold tracking-[-0.02em] text-ink">
              Início
            </p>
            <span className="rounded-full bg-wine/[0.1] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-wine">
              Grátis
            </span>
          </div>

          {/* Hoje dusk hero */}
          <div className="mx-3 mt-2 overflow-hidden rounded-[18px] bg-[linear-gradient(160deg,#3A2430_0%,#5A2232_48%,#2A1A22_100%)] px-3.5 py-4 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.45)]">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[rgba(212,188,140,0.92)]">
              Hoje · 20 set
            </p>
            <p className="mt-1.5 font-sans text-[15px] font-bold leading-tight tracking-[-0.02em] text-[#FFF9F0]">
              Nomear o que pesa
            </p>
            <p className="mt-1 text-[9px] text-[#FFFDFC]/65">
              Ritual livre · ~4 min · sem cartão
            </p>
            <div className="mt-3 flex h-8 items-center justify-center rounded-full bg-[#FFF9F0] text-[10px] font-bold text-[#5A2232]">
              Entrar no Hoje
            </div>
          </div>

          {/* Caminho cover rail */}
          <div className="relative mx-3 mt-2.5 overflow-hidden rounded-[14px]">
            <JourneyCoverArt slug="ansiedade-confianca" size="compact" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#F0E6D0]/85">
                Caminhos · recomendado
              </p>
              <p className="mt-0.5 font-display text-[13px] text-[#FFF9F0]">
                Ansiedade e confiança
              </p>
            </div>
          </div>

          {/* Espaço archive row */}
          <div className="mx-3 mb-3 mt-2.5 flex items-center gap-2.5 rounded-[14px] bg-[#FFFDFC] px-3 py-2.5 shadow-[0_6px_16px_-10px_rgba(44,36,28,0.35)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-wine/[0.08] text-[10px] font-bold text-wine">
              E
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-ink">Espaço</p>
              <p className="text-[9px] text-ink-soft">Linha viva · arquivo íntimo</p>
            </div>
            <span className="text-[12px] text-ink-soft" aria-hidden>
              ›
            </span>
          </div>

          <div className="grid grid-cols-4 border-t border-border/60 bg-[#FFFDFC]/90 px-1 py-2">
            {["Início", "Hoje", "Espaço", "Mais"].map((item, index) => (
              <span
                key={item}
                className={`flex flex-col items-center gap-0.5 py-1 text-[8px] ${
                  index === 0 ? "font-semibold text-wine" : "text-ink-soft"
                }`}
              >
                <span
                  className={`h-1 w-1 rounded-full ${
                    index === 0 ? "bg-wine" : "bg-transparent"
                  }`}
                  aria-hidden
                />
                {item}
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
