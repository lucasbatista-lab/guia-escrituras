import { JourneyCoverArt } from "@/components/journeys/covers/journey-cover-art";

/**
 * Staggered product montage — Hoje / Espaço / Caminhos / Conversar as visuals,
 * not four equal text boxes.
 */
export function EcosystemShowcase() {
  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
          O produto de verdade
        </p>
        <h2 className="mt-2 text-balance font-display text-3xl text-ink sm:text-4xl">
          Presença diária, arquivo íntimo, caminhos e conversa
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Comece grátis com Hoje e Espaço. Conversar e Caminhos completos entram
          quando você quiser — com limites honestos.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        {/* Hoje — large */}
        <article className="amem-montage-tile relative lg:col-span-7 lg:row-span-2">
          <div className="relative min-h-[220px] overflow-hidden bg-[linear-gradient(160deg,#3A2430_0%,#5A2232_48%,#2A1A22_100%)] p-6 sm:min-h-[280px] sm:p-8">
            <div
              aria-hidden
              className="absolute -right-12 -top-16 size-56 rounded-full bg-[radial-gradient(circle,rgba(212,188,140,0.28),transparent_68%)]"
            />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(212,188,140,0.92)]">
              Hoje com Deus
            </p>
            <h3 className="relative mt-3 max-w-[14ch] font-display text-2xl text-[#FFF9F0] sm:text-3xl">
              Um ritual curto, sem cartão
            </h3>
            <p className="relative mt-3 max-w-sm text-sm text-[#FFFDFC]/72">
              Presença diária com Escritura, reflexão e um passo possível —
              livre na conta grátis.
            </p>
            <div className="relative mt-6 inline-flex rounded-full bg-[#FFF9F0] px-4 py-2 text-xs font-bold text-[#5A2232]">
              Entrar no Hoje
            </div>
          </div>
        </article>

        {/* Caminhos cover */}
        <article className="amem-montage-tile relative sm:translate-y-3 lg:col-span-5 lg:translate-y-6">
          <div className="relative overflow-hidden">
            <JourneyCoverArt slug="perdao-limites" size="hero" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F0E6D0]/9">
                Caminhos
              </p>
              <h3 className="mt-1 font-display text-xl text-[#FFF9F0]">
                Sete dias com um tema
              </h3>
              <p className="mt-1 text-xs text-[#FFF9F0]/75">
                Prévia do Dia 1 aberta · progresso no plano Caminho
              </p>
            </div>
          </div>
        </article>

        {/* Espaço */}
        <article className="amem-montage-tile border border-border/60 bg-[#FFFDFC] p-5 sm:-translate-y-2 lg:col-span-5 lg:col-start-8 lg:-translate-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
            Espaço
          </p>
          <h3 className="mt-2 font-display text-xl text-ink">
            Arquivo íntimo vivo
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Orações, diário e salvos — com linha viva, não pastas frias.
          </p>
          <ul className="mt-4 space-y-2">
            {[
              ["Orações", "pedidos e respostas"],
              ["Diário", "páginas privadas"],
              ["Salvos", "marcas que ficam"],
            ].map(([label, meta]) => (
              <li
                key={label}
                className="flex items-center justify-between rounded-xl bg-[rgba(235,231,225,0.55)] px-3 py-2.5"
              >
                <span className="text-sm font-medium text-ink">{label}</span>
                <span className="text-[11px] text-ink-soft">{meta}</span>
              </li>
            ))}
          </ul>
        </article>

        {/* Conversar — quieter, not equal box */}
        <article className="amem-montage-tile border border-ink/10 bg-ink p-5 text-sand-50 lg:col-span-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sand-200">
            Conversar · planos
          </p>
          <h3 className="mt-2 font-display text-xl">
            Clareza à luz das Escrituras
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-sand-200">
            Traga a situação com suas palavras. Escolha tradição ecumênica, evangélica ou católica e ajuste a profundidade. A resposta conecta acolhimento, referências e um próximo passo — com IA e limites honestos.
          </p>
        </article>
      </div>
    </div>
  );
}
