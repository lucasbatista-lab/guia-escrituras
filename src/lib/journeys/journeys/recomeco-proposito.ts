import type { ReadingJourney } from "../types";

export const RECOMECO_PROPOSITO_JOURNEY: ReadingJourney = {
  id: "recomeco-proposito",
  slug: "recomeco-proposito",
  title: "Recomeço e propósito",
  description:
    "Uma jornada de sete etapas para quem se sente atrasado, compara a própria história com a dos outros, ou precisa recomeçar depois de um erro — sem promessa de sucesso garantido.",
  objective:
    "Ajudar você a retomar o caminho com responsabilidade, ritmo humano e propósito cotidiano, sem cobrança de transformação milagrosa.",
  tags: ["recomeço", "propósito", "erro", "paciência", "responsabilidade"],
  steps: [
    {
      id: "recomeco-01",
      slug: "olhar-o-erro-de-frente",
      number: 1,
      title: "Olhar o erro de frente",
      objective:
        "Reconhecer o que deu errado com honestidade, sem dramatizar nem minimizar.",
      bibleReference: "Salmos 51:10-12",
      paraphrase:
        "O salmo pede um coração limpo e um espírito renovado depois de uma falha grave. Há pedido de restauração da alegria, não de apagamento da memória. O caminho passa por reconhecimento sincero diante de Deus.",
      reflection:
        "Erro não precisa definir sua identidade inteira, mas também não melhora se for escondido sob desculpas. Olhar de frente — o que você fez, o que omitiu, o que aprendeu — abre espaço para um recomeço real. Você pode admitir a falha e ainda assim acreditar que há próximo passo. Honestidade é o chão do recomeço.",
      personalQuestion:
        "Qual erro ou desvio você precisa nomear com mais clareza para conseguir seguir adiante?",
      practicalAction:
        "Escreva em três linhas: o que aconteceu, o que você sente sobre isso, e o que não quer repetir. Sem ensaios longos — só a verdade essencial.",
      estimatedMinutes: 6,
      tags: ["erro", "honestidade", "arrependimento"],
    },
    {
      id: "recomeco-02",
      slug: "sensacao-de-atraso",
      number: 2,
      title: "A sensação de atraso",
      objective:
        "Questionar o relógio interno que diz que você “já deveria” estar em outro lugar.",
      bibleReference: "Eclesiastes 3:1-8",
      paraphrase:
        "O texto lembra que há tempo para cada coisa sob o céu: nascer e morrer, plantar e colher, calar e falar. A vida tem estações, não só uma linha reta de conquistas. Há ritmo, e nem tudo cabe no mesmo momento.",
      reflection:
        "A sensação de atraso muitas vezes vem de um roteiro externo: idade, carreira, casamento, ministério, status. Mas histórias reais têm pausas, curvas e recomeços. Você pode estar numa estação de reconstrução sem estar “atrasado” no sentido absoluto. Comparar seu capítulo 3 com o capítulo 20 de outra pessoa só aumenta a angústia.",
      personalQuestion:
        "De quem ou de qual expectativa você herdou a ideia de que está “atrasado”?",
      practicalAction:
        "Liste três marcos que você ainda valoriza — e ao lado, uma versão mais humana e possível para os próximos 90 dias, não para a vida inteira.",
      chatSuggestion:
        "Sinto que estou atrasado na vida e quero repensar isso sem me cobrar milagres.",
      estimatedMinutes: 5,
      tags: ["tempo", "expectativas", "paciência"],
    },
    {
      id: "recomeco-03",
      slug: "comparacao-que-paralisa",
      number: 3,
      title: "Comparação que paralisa",
      objective:
        "Reduzir o hábito de medir seu valor pelo progresso aparente dos outros.",
      bibleReference: "Gálatas 6:4-5",
      paraphrase:
        "O texto orienta cada um a examinar a própria obra, e então ter motivo de satisfação em si, não na comparação com o outro. Cada pessoa carrega a sua carga. O foco volta para o que é seu, não para o ranking alheio.",
      reflection:
        "Redes sociais e círculos próximos amplificam a comparação: parece que todos avançam enquanto você recomeça. Mas você não vê bastidores, dúvidas nem fracassos silenciosos. Propósito cresce melhor no terreno da sua própria história. Você pode se inspirar em alguém sem se destruir por não ser igual.",
      personalQuestion:
        "Quem ou o que você costuma usar como “régua” injusta contra si mesmo?",
      practicalAction:
        "Por 48 horas, reduza o consumo da fonte que mais dispara comparação (uma rede, um grupo, uma conversa). Note se o corpo e a mente ficam um pouco mais leves.",
      estimatedMinutes: 5,
      tags: ["comparação", "identidade", "foco"],
    },
    {
      id: "recomeco-04",
      slug: "frustracao-sem-desistir",
      number: 4,
      title: "Frustração sem desistir",
      objective:
        "Dar espaço à frustração sem deixar que ela dite o abandono de tudo.",
      bibleReference: "Salmos 42:5",
      paraphrase:
        "O salmista fala com a própria alma: por que está abatida? E lembra a si mesmo de esperar em Deus. Há diálogo interno honesto — o abatimento é nomeado, e a esperança é relembrada. Não é negação; é conversa firme consigo.",
      reflection:
        "Frustração é humana quando o plano falha ou o esforço não rende o esperado. Engolir o sentimento só o faz voltar mais forte. Você pode admitir: estou frustrado, cansado, decepcionado — e ainda assim escolher um gesto pequeno de continuidade. Desistir de um caminho tóxico pode ser sabedoria; desistir de si por vergonha é outra história.",
      personalQuestion:
        "O que a sua frustração está tentando te dizer — e o que ela está exagerando?",
      practicalAction:
        "Escreva a frustração em cinco minutos sem censura. Depois circule uma frase útil (“preciso de pausa”, “preciso de ajuda”, “preciso mudar o método”) e ignore o resto catastrófico por hoje.",
      estimatedMinutes: 6,
      tags: ["frustração", "perseverança", "emoções"],
    },
    {
      id: "recomeco-05",
      slug: "responsabilidade-no-recomeço",
      number: 5,
      title: "Responsabilidade no recomeço",
      objective:
        "Assumir o que cabe a você agora, sem carregar o mundo inteiro nas costas.",
      bibleReference: "Tiago 1:22-25",
      paraphrase:
        "O texto distingue ouvir e praticar. Quem só escuta e não age se engana; quem pratica encontra liberdade no caminho. A ênfase está em viver o que se compreendeu, não em acumular intenções.",
      reflection:
        "Recomeço de verdade envolve responsabilidade: pedir perdão se magoou alguém, ajustar rotina, cuidar da saúde, honrar compromissos possíveis. Isso é diferente de se punir sem fim. Você responde pelo que pode fazer hoje — não por consertar o passado inteiro de uma vez. Um ato alinhado vale mais que dez planos perfeitos.",
      personalQuestion:
        "Qual responsabilidade concreta você tem evitado, e que, se enfrentada, aliviaria um pouco a consciência?",
      practicalAction:
        "Escolha uma ação reparadora ou organizada para as próximas 72 horas (uma conversa, um pagamento, uma tarefa adiada). Faça só essa — e marque como feita.",
      chatSuggestion:
        "Quero transformar intenção de recomeço em uma responsabilidade prática e possível.",
      estimatedMinutes: 7,
      tags: ["responsabilidade", "prática", "integridade"],
    },
    {
      id: "recomeco-06",
      slug: "recomeço-gradual",
      number: 6,
      title: "Recomeço gradual",
      objective:
        "Preferir consistência pequena a um recomeço dramático que não se sustenta.",
      bibleReference: "Zacarias 4:10",
      paraphrase:
        "O texto questiona quem despreza o dia dos pequenos começos. Há valor no que ainda parece modesto. O crescimento legítimo muitas vezes começa discreto, sem aplauso.",
      reflection:
        "A tentação do recomeço é querer recuperar “tudo de uma vez”: disciplina total, carreira nova, vida espiritual impecável. Isso costuma durar poucos dias. Passos pequenos e repetíveis constroem confiança de novo. Você pode recomeçar com vinte minutos, uma conversa, uma noite de sono melhor — e isso já é direção.",
      personalQuestion:
        "Qual “pequeno começo” você tem desprezado por achar insuficiente?",
      practicalAction:
        "Defina um hábito mínimo para 14 dias (ex.: 10 minutos de leitura, caminhada curta, oração breve ao acordar). Se falhar um dia, retome no seguinte sem zerar a contagem emocional.",
      estimatedMinutes: 5,
      tags: ["hábitos", "paciência", "consistência"],
    },
    {
      id: "recomeco-07",
      slug: "proposito-sem-promessa",
      number: 7,
      title: "Propósito sem promessa de sucesso",
      objective:
        "Orientar o propósito para fidelidade cotidiana, não para garantia de resultado.",
      bibleReference: "Miqueias 6:8",
      paraphrase:
        "O profeta resume o que se pede: praticar a justiça, amar a misericórdia e andar humildemente com Deus. Não há lista de conquistas externas. O propósito aparece em caráter e caminho, mais do que em troféus.",
      reflection:
        "Propósito não é sinônimo de carreira brilhante ou vida sem falhas. Pode ser cuidar bem de quem está perto, trabalhar com integridade, aprender com o erro e seguir com humildade. Ninguém pode garantir que seus planos vão “dar certo” do jeito que você imagina. O que está ao seu alcance é caminhar com clareza ética e fé adulta — um dia de cada vez.",
      personalQuestion:
        "Se propósito fosse mais sobre o tipo de pessoa que você quer ser do que sobre o que quer conquistar, o que mudaria nesta semana?",
      practicalAction:
        "Escreva uma frase-guia para os próximos sete dias (ex.: “Vou agir com honestidade e paciência no trabalho” ou “Vou cuidar do meu corpo e pedir ajuda quando precisar”). Coloque onde você vê de manhã.",
      chatSuggestion:
        "Quero esclarecer meu propósito sem pressão de sucesso garantido.",
      estimatedMinutes: 6,
      tags: ["propósito", "fidelidade", "próximo passo"],
    },
  ],
};
