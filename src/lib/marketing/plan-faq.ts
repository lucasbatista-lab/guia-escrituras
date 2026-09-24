/** Shared commercial FAQ — home, /planos, and honesty anchors for /ajuda. */

export const PLAN_CHANGE_FAQ = {
  q: "Posso trocar de plano?",
  a: "A troca automática entre planos ainda não está disponível. Você pode comparar os planos agora; quando a troca estiver pronta, avisaremos na conta. Dúvidas urgentes podem ir ao suporte.",
} as const;

export const APROFUNDAR_FAQ = {
  q: "O que é Aprofundar?",
  a: "Modo opcional por mensagem no plano Profundo: uma análise mais extensa da situação, com mais contexto e conexões bíblicas. Você aciona quando quiser. Não é revelação nem orientação profissional.",
} as const;

export const JOURNEYS_PLANS_FAQ = {
  q: "Quais planos incluem Caminhos?",
  a: "Dia 1 de cada Caminho é grátis (também no Essencial). Os 7 dias completos ficam no Caminho, Profundo e Particular. O Essencial mantém o chat completo.",
} as const;

/** Must stay aligned across home, planos, and ajuda (commercial honesty). */
export const CROSS_SURFACE_COMMERCIAL_FAQ = [
  PLAN_CHANGE_FAQ,
  APROFUNDAR_FAQ,
  JOURNEYS_PLANS_FAQ,
] as const;

/** Concise commercial FAQ for /planos — high-intent only. */
export const PLAN_COMMERCIAL_FAQ = [
  {
    q: "Qual plano escolher?",
    a: "Essencial para situações pontuais com Conversar. Caminho se você quer voltar na semana com os 7 dias. Profundo acrescenta Aprofundar sob demanda.",
  },
  {
    q: "O Essencial inclui Conversar?",
    a: "Sim — chat personalizado, histórico e perfil. Caminho completa os Caminhos de 7 dias. Profundo inclui tudo do Caminho e Aprofundar.",
  },
  APROFUNDAR_FAQ,
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Cancele a renovação na Conta e mantenha acesso até o fim do período já pago.",
  },
  PLAN_CHANGE_FAQ,
  {
    q: "O que acontece no limite de uso?",
    a: "Não há cota rígida de mensagens. Se o espaço do plano acabar no período, novas reflexões pausam até o próximo ciclo. Histórico, conta e ajuda continuam acessíveis.",
  },
  JOURNEYS_PLANS_FAQ,
] as const;
