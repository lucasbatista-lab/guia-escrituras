import { ConsentPreferencesTrigger } from "@/components/consent/consent-preferences";
import { LegalDocumentShell } from "@/components/legal/legal-document-shell";
import { CONSENT_POLICY_VERSION } from "@/lib/consent";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata = buildPublicPageMetadata({
  title: "Cookies",
  description:
    "Como o Amém Chat usa cookies necessários e, com autorização, tecnologias de publicidade.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <LegalDocumentShell title="Cookies e preferências">
      <p>Versão das preferências de consentimento: {CONSENT_POLICY_VERSION}.</p>
      <p>
        Usamos cookies e tecnologias semelhantes em duas categorias. Esta página
        explica o que cada categoria faz e como alterar sua escolha. Não afirmamos
        conformidade automática com qualquer lei específica nesta página.
      </p>

      <h2 className="mt-8 font-display text-2xl text-ink">Necessários</h2>
      <p>
        Sempre ativos. Incluem sessão e segurança da conta, bem como cookies
        first-party de aquisição (por exemplo, origem de campanha UTM/ref) usados
        para operar o funil e entender como as pessoas chegaram ao Amém Chat. Esses
        dados não incluem o conteúdo das conversas.
      </p>

      <h2 className="mt-8 font-display text-2xl text-ink">Publicidade</h2>
      <p>
        Desativada por padrão. Somente com a sua autorização podemos carregar o
        Meta Pixel e cookies relacionados (_fbp, _fbc) para medir e otimizar
        campanhas. Eventos enviados à Meta, quando autorizados, limitam-se a
        identificadores técnicos de evento, URL de origem, valor/moeda quando
        aplicável, cookies publicitários, identificadores criptograficamente
        transformados (por exemplo, e-mail em hash SHA-256 para correspondência
        de eventos) e dados técnicos de conexão capturados no checkout (IP e
        User-Agent) — sem conteúdo de conversa, tradição religiosa ou perfil
        espiritual.
      </p>
      <p>
        Você pode aceitar, recusar ou alterar essa escolha a qualquer momento. Ao
        recusar ou revogar, impedimos novos carregamentos publicitários e
        removemos cookies publicitários que este domínio conseguir apagar. Cookies
        necessários e de aquisição first-party (amem_acq_first / amem_acq_last)
        não são removidos por essa ação.
      </p>

      <h2 className="mt-8 font-display text-2xl text-ink">Como alterar</h2>
      <p>
        Use o controle abaixo ou o banner de cookies quando ele estiver visível.
        A preferência é gravada de forma first-party (cookie e armazenamento local
        do navegador), sem dados pessoais no registro de consentimento.
      </p>
      <p className="mt-4">
        <ConsentPreferencesTrigger className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-ink transition hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      </p>
      <p className="mt-6 text-sm text-ink-soft">
        Detalhes adicionais sobre tratamento de dados estão na{" "}
        <a href="/privacidade" className="text-ink underline underline-offset-4">
          Política de Privacidade
        </a>
        .
      </p>
    </LegalDocumentShell>
  );
}
