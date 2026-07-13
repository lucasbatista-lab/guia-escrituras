import { LegalDocumentShell } from "@/components/legal/legal-document-shell";

export const metadata = {
  title: "Transparência sobre IA",
  description: "Como a inteligência artificial é usada no Amém Chat.",
};

export default function TransparenciaIaPage() {
  return (
    <LegalDocumentShell title="Transparência sobre IA">
      <p>
        O Amém Chat usa modelos de linguagem para gerar reflexões. O sistema não
        é uma pessoa, não é Jesus, não é Deus e não representa comunicação
        sobrenatural.
      </p>
      <p>
        As respostas distinguem, quando possível, referência bíblica,
        interpretação e aplicação prática — conforme a tradição que você
        selecionou no perfil espiritual.
      </p>
      <p>
        Referências e interpretações baseadas nas Escrituras. Os textos são
        apresentados por referência e síntese, não como reprodução integral de
        uma tradução bíblica específica.
      </p>
      <p>
        A IA pode errar, omitir contexto ou não cobrir todas as nuances teológicas
        de uma tradição. Use o discernimento pessoal e, quando necessário, busque
        orientação humana qualificada.
      </p>
      <p>
        Não utilizamos suas mensagens para treinar modelos públicos sem
        consentimento específico. O foco é a operação do serviço e melhoria
        responsável com dados agregados.
      </p>
    </LegalDocumentShell>
  );
}
