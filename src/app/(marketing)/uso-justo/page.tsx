import { LegalDocumentShell } from "@/components/legal/legal-document-shell";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata = buildPublicPageMetadata({
  title: "Uso justo",
  description:
    "Como funcionam os limites de uso do Amém Chat: espaço do plano, proteção diária e ritmo — sem cota rígida de mensagens.",
  path: "/uso-justo",
});

export default function UsoJustoPage() {
  return (
    <LegalDocumentShell title="Uso justo">
      <p>
        Cada plano inclui um espaço de conversa adequado ao que você contratou.
        Não prometemos uma quantidade fixa de mensagens: os limites protegem a
        qualidade das respostas e a disponibilidade do serviço.
      </p>

      <h2 className="mt-8 font-display text-2xl text-ink">O que pode interromper o envio</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-ink">Espaço do plano no período:</span>{" "}
          se o uso do mês atingir o limite do plano, novas reflexões ficam
          pausadas até o próximo ciclo de renovação.
        </li>
        <li>
          <span className="font-medium text-ink">Limite diário de segurança:</span>{" "}
          em dias de uso muito intenso, o envio pode pausar até o dia seguinte.
        </li>
        <li>
          <span className="font-medium text-ink">Ritmo curto:</span> várias
          mensagens em poucos minutos podem pedir uma breve espera antes do
          próximo envio.
        </li>
      </ul>

      <h2 className="mt-8 font-display text-2xl text-ink">Como você é informado</h2>
      <p>
        Quando um limite se aplica, a própria conversa mostra a mensagem e o
        próximo passo possível (aguardar, voltar amanhã ou no próximo ciclo). Não
        há cota numérica de mensagens na interface.
      </p>

      <h2 className="mt-8 font-display text-2xl text-ink">O que permanece acessível</h2>
      <p>
        Histórico, conta, ajuda e o material já gerado continuam disponíveis.
        O que fica temporariamente indisponível é o envio de novas mensagens (e,
        quando aplicável, Aprofundar ou avanço que dependa do chat).
      </p>

      <h2 className="mt-8 font-display text-2xl text-ink">Diferença entre planos</h2>
      <p>
        Essencial, Caminho e Profundo compartilham a mesma lógica de uso justo,
        com espaços diferentes: o Caminho amplia o espaço em relação ao
        Essencial; o Profundo amplia de novo e inclui Aprofundar. Detalhes de
        preço e benefícios estão em{" "}
        <TrackingLink href="/planos" className="text-ink underline underline-offset-4">
          Planos
        </TrackingLink>
        .
      </p>

      <p className="mt-6">
        Uso automatizado, scraping, compartilhamento de conta ou padrões que
        degradem o serviço podem resultar em limitação temporária ou
        encerramento da conta. Volumes muito acima do plano: fale com o suporte
        antes de ultrapassar limites de forma recorrente.
      </p>
    </LegalDocumentShell>
  );
}
