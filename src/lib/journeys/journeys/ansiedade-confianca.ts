import type { ReadingJourney } from "../types";

export const ANSIEDADE_CONFIANCA_JOURNEY: ReadingJourney = {
  id: "ansiedade-confianca",
  slug: "ansiedade-confianca",
  title: "Ansiedade e confiança",
  description:
    "Uma jornada de sete etapas para nomear a preocupação, praticar confiança sem negar a realidade e dar passos pequenos e concretos no dia a dia.",
  objective:
    "Ajudar você a lidar com a ansiedade com honestidade, fé adulta e apoio humano quando fizer sentido — sem pressa e sem promessas mágicas.",
  tags: ["ansiedade", "confiança", "preocupação", "descanso", "fé"],
  steps: [
    {
      id: "ansiedade-01",
      slug: "nomear-a-preocupacao",
      number: 1,
      title: "Nomear a preocupação",
      objective:
        "Identificar com clareza o que está te inquietando, sem minimizar nem dramatizar.",
      bibleReference: "Filipenses 4:6-7",
      paraphrase:
        "O texto convida a apresentar a Deus o que pesa no coração, em vez de ficar só ruminando. Não diz que a ansiedade some na hora; aponta um caminho de oração com gratidão e um cuidado que guarda a mente e o coração. A paz aparece como resultado de entregar, não de fingir que está tudo bem.",
      reflection:
        "Muitas vezes a ansiedade cresce quando a preocupação fica vaga. Nomear o medo — dinheiro, saúde, relacionamento, trabalho — já é um ato de lucidez. Você pode orar com sinceridade e, ao mesmo tempo, reconhecer o que está sob seu alcance e o que não está. Confiança não é silêncio forçado; é espaço para dizer a verdade diante de Deus.",
      personalQuestion:
        "Se você pudesse resumir em uma frase o que mais te preocupa agora, qual seria?",
      practicalAction:
        "Escreva em um papel ou nota três preocupações concretas. Ao lado de cada uma, marque: posso agir, posso pedir ajuda, ou só posso esperar.",
      chatSuggestion:
        "Quero organizar minhas preocupações e entender o que está sob meu controle.",
      estimatedMinutes: 5,
      tags: ["preocupação", "clareza", "oração"],
    },
    {
      id: "ansiedade-02",
      slug: "confianca-sem-negacao",
      number: 2,
      title: "Confiança sem negação",
      objective:
        "Distinguir fé madura de otimismo forçado que apaga o que você está sentindo.",
      bibleReference: "Salmos 56:3-4",
      paraphrase:
        "O salmista admite o medo e, no mesmo movimento, escolhe confiar. Não há fingimento: o medo é real, e a confiança também. A fé aqui não apaga a emoção; ela acompanha a pessoa enquanto ela continua andando.",
      reflection:
        "Negar o medo raramente o dissolve; muitas vezes o intensifica. Confiar pode significar reconhecer: estou com medo, e ainda assim posso dar o próximo passo possível. Isso é diferente de repetir frases vazias. Você pode ser honesto com Deus, consigo e com pessoas de confiança — sem precisar parecer sempre firme.",
      personalQuestion:
        "Em que situação você tem sentido pressão para “parecer forte” quando na verdade está ansioso?",
      practicalAction:
        "Hoje, diga em voz baixa ou por escrito uma frase verdadeira: “Estou com medo de…, e ainda assim posso…”. Complete com algo concreto e pequeno.",
      estimatedMinutes: 5,
      tags: ["medo", "honestidade", "confiança"],
    },
    {
      id: "ansiedade-03",
      slug: "presenca-no-agora",
      number: 3,
      title: "Presença no agora",
      objective:
        "Trazer a atenção para o presente, onde a ansiedade costuma perder um pouco da força.",
      bibleReference: "Mateus 6:34",
      paraphrase:
        "Jesus ensina a não carregar o amanhã inteiro hoje. Cada dia já tem o seu próprio peso. O convite não é irresponsabilidade; é não antecipar mentalmente todos os cenários possíveis de uma vez.",
      reflection:
        "A mente ansiosa vive no futuro: e se der errado, e se eu não der conta, e se… O corpo, porém, só existe agora. Voltar ao presente — respiração, tarefas simples, uma conversa — não resolve tudo, mas reduz o volume do alarme. Você pode cuidar do que cabe neste dia sem precisar ter o mapa completo da semana.",
      personalQuestion:
        "Qual preocupação futura você está carregando hoje que, na prática, ainda não precisa ser resolvida agora?",
      practicalAction:
        "Escolha dez minutos sem tela. Observe cinco coisas que você vê, quatro que toca, três que ouve. Depois, faça só a próxima tarefa pequena da sua lista.",
      chatSuggestion:
        "Minha mente fica no futuro e quero praticar presença sem me cobrar perfeição.",
      estimatedMinutes: 6,
      tags: ["presente", "atenção", "calma"],
    },
    {
      id: "ansiedade-04",
      slug: "limites-do-controle",
      number: 4,
      title: "Limites do controle",
      objective:
        "Separar o que depende de você do que não depende, para gastar energia com mais sabedoria.",
      bibleReference: "Provérbios 3:5-6",
      paraphrase:
        "O texto convida a confiar no Senhor de todo o coração e a não se apoiar só no próprio entendimento. Não apaga o planejamento humano; relativiza a ilusão de controle total. Há direção quando a pessoa reconhece seus limites e busca orientação.",
      reflection:
        "Ansiedade muitas vezes vem da tentativa de controlar o incontrolável: a opinião alheia, o tempo, o resultado de decisões de outros. Você pode planejar, conversar e agir — e ainda assim haverá margem de incerteza. Entregar a Deus o que não cabe em suas mãos não é passividade; é honestidade sobre o tamanho real da sua influência.",
      personalQuestion:
        "O que você está tentando controlar que, na verdade, não está sob o seu domínio?",
      practicalAction:
        "Desenhe duas colunas: “Depende de mim” e “Não depende de mim”. Coloque três itens em cada. Escolha uma ação só da primeira coluna para hoje.",
      estimatedMinutes: 6,
      tags: ["controle", "limites", "sabedoria"],
    },
    {
      id: "ansiedade-05",
      slug: "apoio-humano",
      number: 5,
      title: "Apoio humano também conta",
      objective:
        "Lembrar que pedir ajuda a pessoas e profissionais pode fazer parte de uma fé saudável.",
      bibleReference: "Eclesiastes 4:9-10",
      paraphrase:
        "O texto valoriza a companhia: dois são melhores que um, porque um pode levantar o outro quando este cai. A vida de fé não é isolada. Há força e cuidado quando há alguém ao lado.",
      reflection:
        "Confiar em Deus não exclui conversar com um amigo, um líder pastoral ou um profissional de saúde mental. Em alguns momentos, a ansiedade ou a tristeza pedem mais do que reflexão solitária. Buscar apoio é responsabilidade consigo, não falta de fé. Você não precisa carregar tudo sozinho.",
      personalQuestion:
        "Quem, na sua vida, poderia ouvir com respeito o que você está sentindo — ou que tipo de apoio profissional você poderia considerar?",
      practicalAction:
        "Escolha uma pessoa segura e envie uma mensagem simples pedindo conversa, ou anote o contato de um profissional/serviço de saúde mental da sua região para consultar quando precisar.",
      safetyNote:
        "Se a ansiedade ou o desânimo estiverem intensos, persistentes ou atrapalhando o sono, o trabalho ou a segurança, procure apoio humano e profissional de saúde. Você não precisa passar por isso sozinho.",
      chatSuggestion:
        "Estou ansioso e quero pensar em como pedir ajuda sem me sentir fraco.",
      estimatedMinutes: 7,
      tags: ["apoio", "comunidade", "saúde mental"],
    },
    {
      id: "ansiedade-06",
      slug: "descanso-como-pratica",
      number: 6,
      title: "Descanso como prática",
      objective:
        "Tratar o descanso como parte do cuidado, não como luxo ou falha de produtividade.",
      bibleReference: "Salmos 23:1-3",
      paraphrase:
        "A imagem do pastor que conduz a águas tranquilas e restaura o ânimo fala de cuidado e pausa. Não é fuga da vida; é renovação para continuar. Há um Deus que conhece a necessidade humana de descanso.",
      reflection:
        "A ansiedade se alimenta de ritmo acelerado e de culpa por parar. Descansar — dormir, silêncio, um passeio curto, um momento sem exigência — pode ser um ato de confiança: você não precisa produzir o tempo todo para ter valor. O corpo e a mente precisam de intervalo para voltar a pensar com clareza.",
      personalQuestion:
        "O que normalmente te impede de descansar: culpa, excesso de tarefas, ou medo de “perder tempo”?",
      practicalAction:
        "Bloqueie hoje um intervalo de 20 a 30 minutos sem produtividade. Use para dormir um pouco, caminhar ou ficar em silêncio — sem celular de trabalho.",
      estimatedMinutes: 5,
      tags: ["descanso", "ritmo", "cuidado"],
    },
    {
      id: "ansiedade-07",
      slug: "passos-pequenos",
      number: 7,
      title: "Passos pequenos e firmes",
      objective:
        "Encerrar a jornada com um próximo passo realista, sem cobrança de transformação total.",
      bibleReference: "Isaías 30:15",
      paraphrase:
        "O texto associa salvação e força ao descanso e à confiança, não à agitação frenética. Há um caminho de volta à calma pela quietude e pela confiança. Não promete atalhos; aponta uma postura diferente diante da pressão.",
      reflection:
        "Mudança sustentável costuma ser gradual. Um hábito pequeno — orar nomeando a preocupação, limitar o tempo nas redes, pedir ajuda, dormir um pouco melhor — vale mais do que um plano impossível. Você pode sair desta jornada com um único compromisso concreto para a próxima semana, e isso já é progresso.",
      personalQuestion:
        "Qual é o menor passo que você consegue manter nos próximos sete dias para cuidar da sua ansiedade?",
      practicalAction:
        "Escreva um compromisso de uma frase para a semana (ex.: “Vou caminhar 15 minutos três vezes” ou “Vou conversar com X na terça”). Coloque no lugar onde você vê todo dia.",
      chatSuggestion:
        "Quero definir um passo pequeno e realista para a minha ansiedade nesta semana.",
      estimatedMinutes: 6,
      tags: ["passos", "consistência", "próximo passo"],
    },
  ],
};
