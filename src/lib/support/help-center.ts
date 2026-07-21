import { getSupportEmail } from "@/config/legal";

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
    a: "Na área Conta, após entrar. O portal de cobrança gerencia método de pagamento e faturas. Não envie número de cartão por e-mail.",
  },
  {
    category: "jornadas",
    q: "Por que não vejo as Jornadas completas?",
    a: "Jornadas integrais estão nos planos Caminho, Profundo e Particular. No Essencial há prévia e comparação de planos.",
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
] as const;

/** Prefills mailto — never asks for spiritual conversation content. */
export function buildSupportMailto(categoryId: SupportCategoryId): string | null {
  const email = getSupportEmail();
  if (!email) return null;
  const cat =
    SUPPORT_CATEGORIES.find((c) => c.id === categoryId) ??
    SUPPORT_CATEGORIES.find((c) => c.id === "outro")!;
  const body = [
    "Olá, equipe Amém Chat,",
    "",
    `Categoria: ${cat.label}`,
    "",
    "Descreva o problema operacional (acesso, cobrança, erro técnico).",
    "Por favor, não inclua o conteúdo completo das suas conversas espirituais nem dados de cartão.",
    "",
    "E-mail da conta:",
    "Plano (se souber):",
    "Horário aproximado do problema (opcional):",
    "",
  ].join("\n");
  return `mailto:${email}?subject=${encodeURIComponent(cat.subject)}&body=${encodeURIComponent(body)}`;
}
