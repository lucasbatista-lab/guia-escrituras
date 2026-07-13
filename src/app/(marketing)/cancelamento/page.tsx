import { LegalDocumentShell } from "@/components/legal/legal-document-shell";

export const metadata = {
  title: "Cancelamento",
  description: "Como cancelar sua assinatura no Amém Chat.",
};

export default function CancelamentoPage() {
  return (
    <LegalDocumentShell title="Cancelamento de assinatura">
      <p>
        As assinaturas são recorrentes e podem ser canceladas a qualquer momento
        pelo portal de cobrança acessível em Minha conta, quando disponível.
      </p>
      <p>
        Após o cancelamento, o acesso permanece até o fim do período já pago. Não
        há reembolso proporcional automático nesta versão, salvo quando exigido
        por lei.
      </p>
      <p>
        Falhas de pagamento podem suspender o acesso até regularização. Tentativas
        de cobrança seguem as regras do provedor de pagamentos.
      </p>
    </LegalDocumentShell>
  );
}
