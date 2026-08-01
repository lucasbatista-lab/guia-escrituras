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
        Você pode baixar uma cópia dos próprios dados na página Conta
        (/conta), incluindo perfil, preferências, consentimentos e conversas.
        Solicitações adicionais podem ser feitas pelo canal de suporte. A
        exportação não inclui informações de pagamento completas mantidas pelo
        Stripe. Baixar seus dados não equivale à exclusão da conta.
      </p>
      <p>
        Você também pode solicitar exclusão pelo canal de suporte. Alguns
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
      <p>
        Com a sua autorização explícita, também podemos usar tecnologias de
        publicidade (incluindo o Meta Pixel e a Conversions API) para medir e
        otimizar campanhas. Nesses casos, a Meta pode processar eventos
        publicitários técnicos — como nome do evento, identificadores de evento,
        horário, URL de origem, valor e moeda quando aplicáveis, e cookies
        publicitários (_fbp/_fbc) quando existirem. Não enviamos à Meta o
        conteúdo das conversas, assuntos espirituais, tradição religiosa, e-mail,
        telefone nem perfil espiritual nesta integração.
      </p>
      <p>
        A publicidade fica desativada por padrão. Você pode aceitar, recusar ou
        revogar essa escolha em{" "}
        <a href="/cookies" className="underline underline-offset-4">
          Cookies
        </a>
        . Prestadores essenciais (hospedagem, banco de dados, pagamentos e
        processamento de IA) continuam descritos acima e podem processar dados
        necessários ao serviço independentemente da escolha publicitária. Não
        prometemos ausência total de terceiros.
      </p>
    </LegalDocumentShell>
  );
}
