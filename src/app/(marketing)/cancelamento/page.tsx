import { LegalDocumentShell } from "@/components/legal/legal-document-shell";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata = buildPublicPageMetadata({
  title: "Cancelamento",
  description: "Como cancelar sua assinatura no Amém Chat.",
  path: "/cancelamento",
});

export default function CancelamentoPage() {
  return (
    <LegalDocumentShell title="Cancelamento de assinatura">
      <p>
        As assinaturas são recorrentes e podem ser canceladas a qualquer momento
        na página Conta, pela opção “Cancelar renovação”.
      </p>
      <p>
        Após cancelar a renovação, o acesso permanece até o fim do período já
        pago. Não há reembolso proporcional automático nesta versão, salvo quando
        exigido por lei.
      </p>
      <p>
        Falhas de pagamento podem suspender o acesso até regularização. Tentativas
        de cobrança seguem as regras do provedor de pagamentos.
      </p>
      <p>
        Cancelar a renovação é diferente de trocar de plano. A troca automática
        entre planos ainda não está disponível — compare opções em{" "}
        <a href="/planos">Planos</a> ou peça orientação pelo suporte, sem enviar
        dados de cartão.
      </p>
    </LegalDocumentShell>
  );
}
