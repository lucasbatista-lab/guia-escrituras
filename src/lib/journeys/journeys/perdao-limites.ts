import type { ReadingJourney } from "../types";

export const PERDAO_LIMITES_JOURNEY: ReadingJourney = {
  id: "perdao-limites",
  slug: "perdao-limites",
  title: "Perdão e limites",
  description:
    "Uma jornada de sete etapas sobre culpa, perdão sem apagar consequências, proteção em contextos de abuso e reconstrução segura de relacionamentos.",
  objective:
    "Ajudar você a caminhar no perdão com clareza ética: sem forçar reconciliação, sem se manter em perigo e sem carregar culpa que não é sua.",
  tags: ["perdão", "limites", "culpa", "relacionamentos", "segurança"],
  steps: [
    {
      id: "perdao-01",
      slug: "culpa-e-responsabilidade",
      number: 1,
      title: "Culpa e responsabilidade",
      objective:
        "Separar arrependimento saudável de culpa paralisante que não leva a lugar nenhum.",
      bibleReference: "Salmos 32:1-5",
      paraphrase:
        "O salmo descreve o alívio de quem reconhece a própria falta diante de Deus, em vez de ficar engolindo o erro em silêncio. Há peso quando se esconde; há libertação no reconhecimento honesto. O foco não é humilhação eterna, e sim verdade e restauração.",
      reflection:
        "Culpa pode ser um sinal útil quando aponta algo concreto a reparar. Mas também pode virar um laço: você se castiga sem mudar nada, ou carrega culpa por coisas que não controlava. Responsabilidade é diferente: admite o que é seu, pede perdão quando cabe, e segue com reparação possível — sem se definir só pelo erro.",
      personalQuestion:
        "A culpa que você sente agora aponta para algo específico que você pode reparar, ou está mais vaga e destrutiva?",
      practicalAction:
        "Escreva duas listas: “O que é minha responsabilidade” e “O que não é meu”. Seja específico. Não force a segunda lista a ficar vazia.",
      estimatedMinutes: 6,
      tags: ["culpa", "responsabilidade", "honestidade"],
    },
    {
      id: "perdao-02",
      slug: "perdoar-sem-apagar",
      number: 2,
      title: "Perdoar sem apagar consequências",
      objective:
        "Entender perdão como soltar o desejo de vingança, não como fingir que nada aconteceu.",
      bibleReference: "Efésios 4:31-32",
      paraphrase:
        "O texto convida a deixar amargura e raiva destrutiva, e a ser bondoso e compassivo, perdoando uns aos outros. Isso não anula a justiça nem as consequências. O perdão aparece como postura do coração, não como apagamento da memória ou da verdade.",
      reflection:
        "Perdoar não significa dizer que o dano foi pequeno. Você pode soltar o rancor que te consome e, ao mesmo tempo, manter registro claro do que ocorreu. Consequências — distância, conversa difícil, processos legais quando cabem — podem coexistir com um desejo de não viver preso ao ódio. Perdão e memória verdadeira não são inimigos.",
      personalQuestion:
        "O que, para você, seria diferente entre “soltar o rancor” e “fingir que não houve dano”?",
      practicalAction:
        "Escreva uma frase: “Posso desejar não viver na amargura e, ainda assim, reconhecer que…”. Complete com a verdade do que aconteceu, sem suavizar.",
      chatSuggestion:
        "Quero pensar em perdão sem minimizar o que me magoou.",
      estimatedMinutes: 6,
      tags: ["perdão", "consequências", "verdade"],
    },
    {
      id: "perdao-03",
      slug: "sem-reconciliacao-automatica",
      number: 3,
      title: "Sem reconciliação automática",
      objective:
        "Separar perdão interior de reaproximação: uma não obriga a outra.",
      bibleReference: "Romanos 12:18",
      paraphrase:
        "O apóstolo orienta a viver em paz com todos, na medida do possível e naquilo que depende de você. Há um limite implícito: paz não é sempre bilateral, e nem tudo está sob seu controle. O esforço é realista, não absoluto.",
      reflection:
        "Algumas pessoas usam “perdão” para pressionar você a voltar a um vínculo inseguro. Reconciliação exige arrependimento concreto, mudança e segurança mútua — coisas que você não pode fabricar sozinho. Você pode perdoar no coração e manter distância. Isso não é falta de fé; é sabedoria e respeito aos seus limites.",
      personalQuestion:
        "Há alguém de quem você se sente pressionado a se reaproximar, mesmo sem segurança ou mudança real?",
      practicalAction:
        "Defina por escrito: “Perdoar, para mim, neste caso, significa… e não significa…”. Inclua explicitamente se reconciliação está ou não na mesa agora.",
      estimatedMinutes: 5,
      tags: ["reconciliação", "limites", "paz"],
    },
    {
      id: "perdao-04",
      slug: "protecao-em-abuso",
      number: 4,
      title: "Proteção em contextos de abuso",
      objective:
        "Afirmar que perdão nunca exige permanecer em situação de violência ou risco.",
      bibleReference: "Salmos 82:3-4",
      paraphrase:
        "O texto chama a defender o fraco e o órfão, e a livrar o necessitado das mãos dos ímpios. Há um chamado ético à proteção de quem está vulnerável. Justiça e cuidado com a vida importam; silêncio cúmplice não é virtude.",
      reflection:
        "Se há abuso físico, sexual, emocional ou controle coercitivo, sua prioridade é segurança — sua e de quem depende de você. Perdoar não significa voltar, calar ou “dar mais uma chance” sob ameaça. Buscar ajuda, denunciar quando couber e se afastar pode ser o caminho mais alinhado com dignidade e fé. Ninguém tem o direito de usar linguagem espiritual para te manter em perigo.",
      personalQuestion:
        "Você se sente seguro(a) neste relacionamento — física, emocional e financeiramente — ou há sinais de controle e medo?",
      practicalAction:
        "Se houver risco, priorize um plano de segurança: contate alguém de confiança, registre evidências se for seguro, e busque orientação especializada na sua região. Não discuta planos de saída com quem te ameaça.",
      safetyNote:
        "Perdão não exige reconciliação nem permanecer em risco. Em situação de abuso ou violência, busque apoio seguro e especializado. Sua proteção vem primeiro.",
      estimatedMinutes: 8,
      tags: ["abuso", "segurança", "proteção"],
    },
    {
      id: "perdao-05",
      slug: "limites-saudaveis",
      number: 5,
      title: "Limites saudáveis",
      objective:
        "Praticar limites claros como expressão de cuidado consigo e com o outro.",
      bibleReference: "Provérbios 4:23",
      paraphrase:
        "O texto aconselha a guardar o coração com toda a diligência, porque dele procedem as fontes da vida. Cuidar do que entra e do que se permite não é egoísmo; é preservação. Há sabedoria em vigiar influências e vínculos.",
      reflection:
        "Limites dizem: “isto eu aceito; isto eu não aceito”. Eles podem ser tom de voz, horários, temas de conversa, ou o fim de um contato. Comunicar com firmeza e respeito é diferente de explodir ou de se anular. Você pode amar o próximo e ainda assim dizer não. Limite bem colocado reduz amargura futura.",
      personalQuestion:
        "Qual limite você precisa comunicar — ou reforçar — e tem adiado por medo de desagradar?",
      practicalAction:
        "Escreva uma frase curta de limite (ex.: “Não falo sobre esse assunto por mensagem” ou “Preciso de X dias sem contato”). Se for seguro, pratique dizê-la em voz alta uma vez.",
      chatSuggestion:
        "Preciso de ajuda para formular um limite claro sem agressividade nem culpa.",
      estimatedMinutes: 6,
      tags: ["limites", "comunicação", "cuidado"],
    },
    {
      id: "perdao-06",
      slug: "culpa-alheia",
      number: 6,
      title: "Quando a culpa não é sua",
      objective:
        "Desfazer a tendência de se culpar por escolhas e agressões de outras pessoas.",
      bibleReference: "Gálatas 6:5",
      paraphrase:
        "O texto lembra que cada um carregará a sua própria carga. Há responsabilidade pessoal — e, por contraste, há o que não cabe a você carregar. Nem todo peso que chega até você é seu por direito.",
      reflection:
        "Em dinâmicas abusivas ou de manipulação, é comum a vítima absorver a culpa: “se eu tivesse sido diferente…”. Isso distorce a realidade. O agressor responde pelos seus atos. Você pode examinar sua parte com honestidade sem assumir o que não é seu. Soltar culpa alheia é um passo de liberdade, não de frieza.",
      personalQuestion:
        "Que frase de autoacusação você repete (“foi minha culpa porque…”) e que talvez precise ser questionada?",
      practicalAction:
        "Reescreva uma autoacusação em duas partes: “Minha parte real foi…” e “A parte que não era minha foi…”. Leia em voz alta só a segunda, se fizer sentido.",
      safetyNote:
        "Se alguém insiste que tudo é sua culpa enquanto exerce controle ou violência, isso pode ser manipulação. Considere apoio externo de confiança.",
      estimatedMinutes: 7,
      tags: ["autoacusação", "clareza", "dignidade"],
    },
    {
      id: "perdao-07",
      slug: "reconstrucao-segura",
      number: 7,
      title: "Reconstrução segura",
      objective:
        "Encerrar com um próximo passo de cura e vínculo que respeite seu ritmo e sua segurança.",
      bibleReference: "Isaías 61:1-3",
      paraphrase:
        "A passagem fala de cuidar dos quebrantados de coração e de trocar cinzas por alegria, luto por louvor. É linguagem de restauração gradual, não de pressa. Há esperança de reconstrução sem negar a ferida que existiu.",
      reflection:
        "Recomeçar relacionamentos — ou a vida depois de um vínculo — não precisa ser espetacular. Pode ser terapia, amizades seguras, fé praticada com calma, ou simplesmente dormir melhor. Você não deve nada a quem te feriu em nome de “provar que perdoou”. Reconstrução segura respeita tempo, verdade e proteção.",
      personalQuestion:
        "Qual seria um sinal concreto, para você, de que está reconstruindo com mais segurança do que antes?",
      practicalAction:
        "Escolha um gesto de cuidado para esta semana: conversa com alguém seguro, sessão de apoio, tempo sozinho sem culpa, ou um limite que você vai manter. Anote e revise no domingo.",
      chatSuggestion:
        "Quero pensar em um recomeço relacional que preserve meus limites e minha segurança.",
      estimatedMinutes: 6,
      tags: ["reconstrução", "cura", "próximo passo"],
    },
  ],
};
