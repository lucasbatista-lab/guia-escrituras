import { LegalDocumentShell } from "@/components/legal/legal-document-shell";
import { getTermsVersion } from "@/config/legal";

export const metadata = {
  title: "Termos de Uso",
  description: "Termos de uso do Amém Chat.",
};

export default function TermosPage() {
  return (
    <LegalDocumentShell title="Termos de Uso">
      <p>Versão: {getTermsVersion()}</p>
      <p>
        O Amém Chat é uma plataforma de reflexão baseada nas Escrituras que utiliza
        inteligência artificial. Não afirma ser Jesus, Deus ou comunicação
        sobrenatural.
      </p>
      <p>
        Ao criar conta, você declara ter capacidade legal e concorda em usar o
        serviço de forma respeitosa, sem tentar extrair dados de outros usuários
        ou abusar dos limites de uso.
      </p>
      <p>
        As respostas são interpretações geradas por IA a partir das fontes e
        tradições configuradas no seu perfil. Elas não substituem líder religioso,
        profissional de saúde, psicólogo, advogado ou serviço de emergência.
      </p>
      <p>
        Planos pagos são assinaturas recorrentes mensais, sem período de teste
        gratuito nesta versão. O acesso às funcionalidades depende do plano ativo
        e dos limites de uso justo.
      </p>
      <p>
        Podemos suspender contas em caso de violação destes termos, fraude ou
        abuso. Direitos legais obrigatórios do consumidor permanecem aplicáveis
        conforme a legislação vigente.
      </p>
    </LegalDocumentShell>
  );
}
