import { LegalDocumentShell } from "@/components/legal/legal-document-shell";

export const metadata = {
  title: "Uso justo",
  description: "Limites de uso do Amém Chat.",
};

export default function UsoJustoPage() {
  return (
    <LegalDocumentShell title="Uso justo">
      <p>
        Cada plano inclui uma franquia mensal de uso de IA adequada ao perfil
        contratado. O objetivo é garantir qualidade e sustentabilidade para todos
        os assinantes.
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
