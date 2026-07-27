import { LegalDocumentShell } from "@/components/legal/legal-document-shell";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata = buildPublicPageMetadata({
  title: "Uso justo",
  description: "Limites de uso do Amém Chat.",
  path: "/uso-justo",
});

export default function UsoJustoPage() {
  return (
    <LegalDocumentShell title="Uso justo">
      <p>
        Cada plano inclui um espaço mensal de conversas adequado ao perfil
        contratado. Os limites são flexíveis e protegidos por orçamento mensal,
        uso diário e controle de ritmo — não há franquia fixa de mensagens
        exposta como promessa.
      </p>
      <p>
        O Essencial é indicado para uso pontual ou moderado. O Caminho oferece
        mais espaço para quem volta várias vezes na semana. O Profundo amplia a
        tolerância para uso mais intenso, inclusive em dias com mais conversas e
        análises adicionais com Aprofundar.
      </p>
      <p>
        Uso muito acima do esperado para o plano pode encontrar limite
        temporário. Isso protege a qualidade das respostas, a disponibilidade do
        serviço e a sustentabilidade para todos os assinantes.
      </p>
      <p>
        Uso automatizado, scraping, compartilhamento de conta ou padrões que
        degradem o serviço podem resultar em limitação temporária ou encerramento
        da conta.
      </p>
      <p>
        Se você precisar de volumes muito acima do plano, entre em contato pelo
        suporte antes de ultrapassar limites de forma recorrente.
      </p>
    </LegalDocumentShell>
  );
}
