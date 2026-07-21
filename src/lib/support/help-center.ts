import { getSupportEmail } from "@/config/legal";
import {
  APROFUNDAR_FAQ,
  JOURNEYS_PLANS_FAQ,
  PLAN_CHANGE_FAQ,
} from "@/lib/marketing/plan-faq";

export type SupportCategoryId =
  | "acesso"
  | "cobranca"
  | "uso"
  | "privacidade"
  | "jornadas"
  | "cancelamento"
  | "tecnico"
  | "outro";

export const SUPPORT_CATEGORIES: Array<{
  id: SupportCategoryId;
  label: string;
  description: string;
  subject: string;
}> = [
  {
    id: "acesso",
    label: "Acesso e login",
    description: "Entrar, confirmar e-mail, recuperar senha ou sessão.",
    subject: "[Amém Chat] Acesso e login",
  },
  {
    id: "cobranca",
    label: "Cobrança e assinatura",
    description: "Pagamento, recibo, status da assinatura (sem dados de cartão).",
    subject: "[Amém Chat] Cobrança e assinatura",
  },
  {
    id: "uso",
    label: "Uso do chat e limites",
    description: "Margem de uso, limites diários ou dúvidas de funcionamento.",
    subject: "[Amém Chat] Uso e limites",
  },
  {
    id: "privacidade",
    label: "Privacidade e dados",
    description: "Exportação, retenção ou perguntas sobre privacidade.",
    subject: "[Amém Chat] Privacidade e dados",
  },
  {
    id: "jornadas",
    label: "Jornadas de leitura",
    description: "Acesso, progresso ou conteúdo editorial das Jornadas.",
    subject: "[Amém Chat] Jornadas",
  },
  {
    id: "cancelamento",
    label: "Cancelamento",
    description: "Cancelar renovação ou entender o acesso até o fim do período.",
    subject: "[Amém Chat] Cancelamento",
  },
  {
    id: "tecnico",
    label: "Problema técnico",
    description: "Erro de página, carregamento ou falha ao enviar mensagem.",
    subject: "[Amém Chat] Problema técnico",
  },
  {
    id: "outro",
    label: "Outro (comercial / acesso Particular)",
    description: "Solicitar Particular ou assunto comercial. Sem chat pastoral.",
    subject: "[Amém Chat] Contato comercial",
  },
];

export const HELP_FAQ = [
  {
    category: "acesso",
    q: "Não consigo entrar na conta",
    a: "Use Recuperar senha em /recuperar-senha. Confirme também o e-mail de cadastro. Se o link expirou, solicite um novo pela tela de confirmação.",
  },
  {
    category: "cobranca",
    q: "Onde vejo ou altero minha assinatura?",
    a: "Na área Conta, após entrar. O portal de cobrança gerencia método de pagamento e faturas. A troca automática entre planos ainda não está disponível por esse portal. Não envie número de cartão por e-mail.",
  },
  {
    category: "cobranca",
    q: PLAN_CHANGE_FAQ.q,
    a: PLAN_CHANGE_FAQ.a,
  },
  {
    category: "uso",
    q: APROFUNDAR_FAQ.q,
    a: APROFUNDAR_FAQ.a,
  },
  {
    category: "jornadas",
    q: "Por que não vejo as Jornadas completas?",
    a: "Jornadas integrais estão nos planos Caminho, Profundo e Particular. No Essencial há prévia e comparação de planos.",
  },
  {
    category: "jornadas",
    q: JOURNEYS_PLANS_FAQ.q,
    a: JOURNEYS_PLANS_FAQ.a,
  },
  {
    category: "cancelamento",
    q: "Como cancelo a renovação?",
    a: "Em Conta → Assinatura. O acesso permanece até o fim do período já pago. Detalhes em /cancelamento.",
  },
  {
    category: "privacidade",
    q: "Como baixar meus dados?",
    a: "Em Conta há a opção de exportar. O arquivo inclui conversas suas e progresso de Jornadas (ids de etapa), sem segredos de pagamento.",
  },
  {
    category: "uso",
    q: "O Amém Chat é Jesus falando?",
    a: "Não. É reflexão cristã com IA, baseada nas Escrituras. Não afirma ser Jesus, Deus, revelação ou autoridade pastoral.",
  },
  {
    category: "tecnico",
    q: "A mensagem não enviou ou a página falhou",
    a: "Atualize a página e tente de novo. Se o erro continuar, use a categoria Problema técnico abaixo — descreva horário e o que apareceu na tela, sem colar o conteúdo completo da conversa.",
  },
  {
    category: "outro",
    q: "Estou em crise — o suporte é aconselhamento?",
    a: "Não. O Amém Chat e o e-mail de suporte não substituem emergência, CVV (188) nem cuidado pastoral/clínico presencial. Em risco imediato, busque ajuda humana local agora.",
  },
] as const;

export type HelpFaqItem = (typeof HELP_FAQ)[number];

/** Case-insensitive local FAQ filter — no network, no sensitive logging. */
export function filterHelpFaq(
  query: string,
  items: readonly HelpFaqItem[] = HELP_FAQ,
): HelpFaqItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter((item) => {
    const hay = `${item.q} ${item.a} ${item.category}`.toLowerCase();
    return hay.includes(q);
  });
}

export function groupHelpFaqByCategory(
  items: readonly HelpFaqItem[],
): Array<{ category: SupportCategoryId; label: string; items: HelpFaqItem[] }> {
  const byId = new Map<SupportCategoryId, HelpFaqItem[]>();
  for (const item of items) {
    const list = byId.get(item.category) ?? [];
    list.push(item);
    byId.set(item.category, list);
  }
  return SUPPORT_CATEGORIES.map((cat) => ({
    category: cat.id,
    label: cat.label,
    items: byId.get(cat.id) ?? [],
  })).filter((g) => g.items.length > 0);
}

const MAILTO_HINTS: Record<SupportCategoryId, string[]> = {
  acesso: [
    "Descreva se o problema é login, confirmação de e-mail ou recuperação de senha.",
    "Horário aproximado (opcional):",
  ],
  cobranca: [
    "Descreva o status da assinatura ou o recibo — sem número de cartão.",
    "Horário aproximado (opcional):",
  ],
  uso: [
    "Descreva o limite ou comportamento do chat (sem colar a conversa completa).",
    "Horário aproximado (opcional):",
  ],
  privacidade: [
    "Descreva a dúvida sobre exportação, retenção ou privacidade.",
  ],
  jornadas: [
    "Descreva a Jornada/etapa e o problema de acesso ou progresso.",
  ],
  cancelamento: [
    "Descreva se deseja cancelar a renovação ou entender o acesso até o fim do período.",
  ],
  tecnico: [
    "Descreva a tela/rota e o que apareceu (erro, carregamento, envio).",
    "Navegador e dispositivo (opcional):",
    "Horário aproximado (opcional):",
  ],
  outro: [
    "Descreva o assunto comercial ou Particular — sem pedido de aconselhamento pastoral.",
  ],
};

/** Prefills mailto — never asks for spiritual conversation content. */
export function buildSupportMailto(categoryId: SupportCategoryId): string | null {
  const email = getSupportEmail();
  if (!email) return null;
  const cat =
    SUPPORT_CATEGORIES.find((c) => c.id === categoryId) ??
    SUPPORT_CATEGORIES.find((c) => c.id === "outro")!;
  const hints = MAILTO_HINTS[cat.id] ?? MAILTO_HINTS.outro;
  const body = [
    "Olá, equipe Amém Chat,",
    "",
    `Categoria: ${cat.label}`,
    "",
    ...hints,
    "",
    "Por favor, não inclua o conteúdo completo das suas conversas espirituais nem dados de cartão.",
    "",
    "E-mail da conta:",
    "Plano (se souber):",
    "",
  ].join("\n");
  return `mailto:${email}?subject=${encodeURIComponent(cat.subject)}&body=${encodeURIComponent(body)}`;
}

/** Honest support timing — not an SLA promise. */
export const SUPPORT_RESPONSE_NOTE =
  "Respondemos por e-mail em dias úteis, geralmente em até 2 dias úteis. Não é canal de emergência nem aconselhamento pastoral.";

