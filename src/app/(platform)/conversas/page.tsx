export default function ConversasPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Conversas</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Histórico de conversas aparecerá aqui após conectar o Supabase e
        persistir mensagens. Nesta fatia, o chat funciona em memória de
        sessão no servidor (modo demonstração).
      </p>
      <ul className="mt-8 space-y-3 text-sm text-ink-soft">
        <li className="rounded-xl border border-dashed border-border/80 px-4 py-3">
          Nenhuma conversa persistida ainda
        </li>
      </ul>
    </div>
  );
}
