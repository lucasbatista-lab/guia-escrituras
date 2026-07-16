"use client";

import { useState } from "react";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DemoScenario = {
  id: string;
  label: string;
  prompt: string;
  welcome: string;
  references: string[];
  interpretation: string;
  actions: string[];
  followUp: string;
};

const SCENARIOS: DemoScenario[] = [
  {
    id: "decisoes",
    label: "Ansiedade e decisões",
    prompt:
      "Estou com medo de tomar uma decisão errada e me arrepender. Como posso organizar meus pensamentos à luz das Escrituras?",
    welcome:
      "Esse medo é humano — e não significa falta de fé. Dá para organizar o coração e a mente sem fingir certeza absoluta.",
    references: ["Tiago 1:5", "Provérbios 3:5-6"],
    interpretation:
      "As Escrituras convidam a pedir sabedoria com humildade e a confiar sem abdicar da responsabilidade de decidir. Clareza nasce de oração, conselho e um passo de cada vez — não de pressa ansiosa.",
    actions: [
      "Escreva em duas colunas o que você teme perder e o que espera ganhar.",
      "Peça sabedoria em oração e converse com uma pessoa de confiança.",
      "Defina um próximo passo pequeno e concreto para esta semana.",
    ],
    followUp: "Qual parte dessa decisão mais pesa agora: o medo, a pressa ou a falta de clareza?",
  },
  {
    id: "dinheiro",
    label: "Dinheiro e trabalho",
    prompt:
      "Tenho contas vencendo e medo de não prosperar no trabalho. Como buscar forças sem me envergonhar?",
    welcome:
      "Pressão financeira cansa o corpo e a alma. Você não precisa carregar isso como se fosse só falta de fé.",
    references: ["Filipenses 4:6-7", "Mateus 6:31-33"],
    interpretation:
      "A orientação bíblica não nega a realidade das contas: convida a apresentar a preocupação, priorizar o essencial e agir com diligência — sem culpa paralizante.",
    actions: [
      "Liste o que é urgente esta semana e o que pode esperar.",
      "Faça um pedido concreto de ajuda ou renegociação, se couber.",
      "Reserve alguns minutos para orar e respirar antes da próxima tarefa.",
    ],
    followUp: "O que mais pesa agora: a conta em si ou o medo do que ela representa?",
  },
  {
    id: "familia",
    label: "Perdão e família",
    prompt:
      "Quero perdoar sem voltar a permitir que me machuquem. O que as Escrituras iluminam?",
    welcome:
      "Perdoar não é apagar a ferida nem abrir a porta para o mesmo dano. Dá para buscar paz com limites claros.",
    references: ["Colossenses 3:13", "Efésios 4:31-32"],
    interpretation:
      "Perdão, nas Escrituras, é soltar a dívida do coração — não negar o que doeu nem abrir mão de proteção sábia. Mansidão e verdade podem caminhar juntas.",
    actions: [
      "Nomeie o que doeu sem minimizar.",
      "Defina um limite concreto e respeitoso.",
      "Escolha um gesto pequeno de paz que não te exponha de novo.",
    ],
    followUp: "Você precisa mais de coragem para soltar a amargura ou de clareza para firmar o limite?",
  },
  {
    id: "culpa",
    label: "Culpa e recomeço",
    prompt:
      "Sinto vergonha de repetir o mesmo erro. Há esperança prática para recomeçar?",
    welcome:
      "Vergonha isola; recomeço começa quando a falha é nomeada com honestidade e um passo concreto.",
    references: ["Lamentações 3:22-23", "1 João 1:9"],
    interpretation:
      "As misericórdias se renovam — isso não apaga consequências, mas abre caminho para confissão, mudança e um próximo passo possível hoje.",
    actions: [
      "Escreva o padrão que se repete em uma frase honesta.",
      "Peça perdão a Deus e, se couber, a quem foi afetado.",
      "Escolha uma mudança pequena e observável para as próximas 24 horas.",
    ],
    followUp: "Qual seria o menor passo honesto que você consegue dar hoje?",
  },
  {
    id: "silencio",
    label: "Silêncio espiritual",
    prompt:
      "Parece que Deus está em silêncio. Como continuar sem me sentir abandonado?",
    welcome:
      "O silêncio dói — e muitos na Escritura também o sentiram. Continuar não exige fingir que está tudo bem.",
    references: ["Salmo 13:1-6", "Isaías 40:31"],
    interpretation:
      "Lamentar com honestidade faz parte da fé. Esperar no Senhor não é passividade: é permanecer presente, cuidar do corpo e dar o próximo passo possível enquanto a clareza ainda não veio.",
    actions: [
      "Ore com palavras simples, inclusive a dúvida.",
      "Leia um Salmo em voz baixa e anote uma frase que ecoe.",
      "Cuide de um gesto prático de descanso ou companhia hoje.",
    ],
    followUp: "O que mais precisa agora: ser ouvido, descansar ou retomar um ritmo leve de oração?",
  },
];

export function ChatDemo() {
  const [activeId, setActiveId] = useState(SCENARIOS[0]!.id);
  const active = SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0]!;

  return (
    <div
      id="demonstracao"
      className="animate-fade-up-delayed overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-md backdrop-blur-sm"
      aria-label="Demonstração interativa do chat"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Exemplo interativo</p>
          <p className="text-xs text-ink-soft">
            Sem chamada à API · respostas ilustrativas
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-sand-200/80 px-2 py-1 text-[11px] uppercase tracking-wide text-ink-soft">
          exemplo
        </span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/60 px-4 py-3">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => setActiveId(scenario.id)}
            className={cn(
              "min-h-9 rounded-md px-2.5 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeId === scenario.id
                ? "bg-ink text-sand-50"
                : "bg-sand-100 text-ink-soft hover:text-ink",
            )}
            aria-pressed={activeId === scenario.id}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div
        key={active.id}
        className="space-y-4 p-4 font-chat text-[15px] leading-relaxed motion-safe:animate-fade-up sm:p-5"
      >
        <p className="text-xs text-ink-soft">
          Isto é um exemplo local — não uma conversa real nem voz divina.
        </p>
        <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-sand-50 sm:max-w-[85%]">
          {active.prompt}
        </div>
        <div className="max-w-[96%] space-y-3 rounded-2xl rounded-bl-md border border-border/80 bg-sand-50/95 px-4 py-3 text-ink sm:max-w-[92%]">
          <p>{active.welcome}</p>
          <p className="rounded-md bg-card/90 px-2.5 py-1.5 text-xs font-medium text-ink-soft">
            Referências · {active.references.join(" · ")}
          </p>
          <p>
            <span className="font-medium text-ink">Interpretação: </span>
            {active.interpretation}
          </p>
          <div>
            <p className="text-sm font-medium text-ink">Próximos passos possíveis</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-soft">
              {active.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm italic text-ink-soft">{active.followUp}</p>
        </div>
      </div>

      <div className="border-t border-border/70 px-4 py-4 sm:px-5">
        <p className="text-sm text-ink-soft">
          Gostou do tom? Comece com a sua situação — com a tradição cristã que
          você escolher.
        </p>
        <Button
          asChild
          className="mt-3 min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto"
        >
          <TrackingLink href="/planos">Começar com a minha situação</TrackingLink>
        </Button>
      </div>
    </div>
  );
}
