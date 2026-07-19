import { LegalDocumentShell } from "@/components/legal/legal-document-shell";
import { getPrivacyVersion } from "@/config/legal";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata = buildPublicPageMetadata({
  title: "Política de Privacidade",
  description: "Como o Amém Chat trata seus dados.",
  path: "/privacidade",
});

export default function PrivacidadePage() {
  return (
    <LegalDocumentShell title="Política de Privacidade">
      <p>Versão: {getPrivacyVersion()}</p>
      <p>
        Coletamos dados necessários para autenticação (e-mail), perfil espiritual
        escolhido por você, histórico de conversas e eventos de uso para operar o
        serviço e estimar custos.
      </p>
      <p>
        Não vendemos seus dados. Prestadores essenciais (hospedagem, banco de
        dados, pagamentos e processamento de IA) podem processar dados sob contrato
        e apenas na medida necessária.
      </p>
      <p>
        Você pode solicitar informações ou exclusão pelo canal de suporte. Alguns
        registros de cobrança podem precisar ser mantidos por obrigação legal.
      </p>
      <p>
        Não armazenamos número de cartão em nossos servidores; pagamentos são
        processados pelo provedor de pagamentos.
      </p>
      <p>
        Usamos cookies first-party e parâmetros de campanha (UTM e código de
        indicação) para entender a origem de visitas e cadastros — por exemplo,
        qual link ou vídeo levou alguém até o Amém Chat. Esses dados não incluem
        o conteúdo das conversas e servem à mensuração e melhoria do serviço.
      </p>
    </LegalDocumentShell>
  );
}
