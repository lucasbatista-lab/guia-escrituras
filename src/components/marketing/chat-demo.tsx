export function ChatDemo() {
  return (
    <div
      className="animate-fade-up-delayed overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm backdrop-blur-sm"
      aria-label="Exemplo de conversa"
    >
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Exemplo de conversa</p>
          <p className="text-xs text-ink-soft">
            Trechos ilustrativos · não é citação real
          </p>
        </div>
        <span className="rounded-md bg-sand-200/80 px-2 py-1 text-[11px] uppercase tracking-wide text-ink-soft">
          exemplo
        </span>
      </div>
      <div className="space-y-4 p-4 font-chat text-[15px] leading-relaxed sm:p-5">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-sand-50">
          Estou ansioso com uma decisão difícil no trabalho. Como posso
          enxergar isso com mais paz?
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border/80 bg-sand-50/90 px-4 py-3 text-ink">
          <p>
            Esta é uma reflexão gerada por inteligência artificial, baseada
            nas Escrituras — não uma voz divina.
          </p>
          <p className="mt-3">
            À luz de Mateus 11:28-30, o convite é trazer o cansaço em oração e
            dar o próximo passo com mansidão, sem carregar tudo sozinho.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Referência · interpretação · aplicação prática
          </p>
        </div>
      </div>
    </div>
  );
}
