import importedCatalog from "./editorial/imported.json";
import {
  addCalendarDays,
  calendarDayIndex,
  isIsoCalendarDate,
} from "./timezone";
import type { DailyContent } from "./types";

/**
 * QA editorial seed (7 days). Not a licensed Bible corpus.
 * Paraphrases are original editorial synthesis for product QA.
 */
export const DAILY_CONTENT_SEED: readonly DailyContent[] = [
  {
    id: "qa-01-confianca",
    publishDate: "2026-09-14",
    theme: "confiança",
    title: "Descansar o coração",
    scriptureBook: "Filipenses",
    scriptureChapter: 4,
    scriptureStartVerse: 6,
    scriptureEndVerse: 7,
    translationId: null,
    scriptureText: null,
    scriptureReference: "Filipenses 4:6-7",
    paraphrase:
      "Em síntese, a passagem convida a levar a Deus o que aperta o peito, com gratidão, e a receber uma paz que guarda o coração — não uma paz que ignora o problema.",
    reflection:
      "Há dias em que a mente não para. A fé cristã não pede que você finja calma: pede que você entregue o peso com palavras honestas. Orar não é um truque para silenciar o corpo; é um lugar para dizer o que está acontecendo e pedir ajuda para o próximo passo. A paz prometida não apaga a responsabilidade — ela devolve espaço para respirar e agir sem se destruir por dentro.",
    prayer:
      "Senhor, eu trago o que está apertado hoje. Ensina-me a falar contigo sem disfarce, a receber a tua paz e a dar o próximo passo com lucidez. Amém.",
    action:
      "Escreva em uma frase o que está pesando agora e leia essa frase em voz baixa como oração, sem tentar resolver tudo de uma vez.",
    status: "published",
  },
  {
    id: "qa-02-presenca",
    publishDate: "2026-09-15",
    theme: "presença",
    title: "Deus perto no caminho",
    scriptureBook: "Salmos",
    scriptureChapter: 23,
    scriptureStartVerse: 1,
    scriptureEndVerse: 4,
    translationId: null,
    scriptureText: null,
    scriptureReference: "Salmos 23:1-4",
    paraphrase:
      "A passagem ensina que o Senhor cuida como pastor: não promete ausência de vale, promete companhia no vale.",
    reflection:
      "Muita gente espera que a fé tire o caminho difícil. O salmo é mais sóbrio e mais terno: mesmo no trecho escuro, você não está entregue ao acaso. Presença não é sentimento constante; às vezes é só a decisão de não caminhar sozinho. Se hoje o vale parece longo, o convite não é fingir alegria — é lembrar de quem vai com você.",
    prayer:
      "Senhor, acompanha-me neste trecho. Quando eu não sentir nada, guarda-me mesmo assim. Dá-me coragem para o próximo passo. Amém.",
    action:
      "Diga a uma pessoa de confiança, em uma frase, por onde você está passando hoje. Não precisa explicar tudo.",
    status: "published",
  },
  {
    id: "qa-03-cansaço",
    publishDate: "2026-09-16",
    theme: "cansaço",
    title: "Descanso que não é fuga",
    scriptureBook: "Mateus",
    scriptureChapter: 11,
    scriptureStartVerse: 28,
    scriptureEndVerse: 30,
    translationId: null,
    scriptureText: null,
    scriptureReference: "Mateus 11:28-30",
    paraphrase:
      "À luz desse texto, Jesus chama os cansados a se aproximar — não para negar o peso, mas para trocar um jugo destrutivo por um caminho possível.",
    reflection:
      "Cansaço pode ser corpo, alma ou os dois. A fé cristã não romantiza a exaustão. Há um convite concreto: parar de carregar sozinho o que já passou do limite. Descansar em Cristo não é abandonar deveres reais; é recusar a mentira de que você precisa dar conta de tudo para merecer cuidado. Hoje, o santo pode ser o simples.",
    prayer:
      "Jesus, eu estou cansado. Ensina-me a soltar o que não me cabe e a cumprir, com mansidão, o que de fato é meu. Amém.",
    action:
      "Escolha uma tarefa que pode esperar até amanhã e deixe-a de lado de propósito por hoje.",
    status: "published",
  },
  {
    id: "qa-04-perdão",
    publishDate: "2026-09-17",
    theme: "perdão",
    title: "Perdoar sem apagar o dano",
    scriptureBook: "Efésios",
    scriptureChapter: 4,
    scriptureStartVerse: 31,
    scriptureEndVerse: 32,
    translationId: null,
    scriptureText: null,
    scriptureReference: "Efésios 4:31-32",
    paraphrase:
      "A passagem pede que se deixe o azedume e se vista de bondade — um movimento de graça recebida, não de fingimento.",
    reflection:
      "Perdoar não é dizer que a ferida foi pequena. Também não é reabrir a porta sem critério. Na vida cristã, o perdão começa quando você recusa deixar que o rancor escreva o resto da história. Limites saudáveis podem caminhar junto. Se o processo é lento, isso não prova falta de fé — prova honestidade.",
    prayer:
      "Senhor, onde há amargura em mim, começa a tua obra. Dá-me lucidez para o perdão e coragem para os limites necessários. Amém.",
    action:
      "Ore uma vez pela pessoa envolvida, sem ensaiar um diálogo agora. Se o tema for grave, não force reconciliação sozinho.",
    status: "published",
  },
  {
    id: "qa-05-esperança",
    publishDate: "2026-09-18",
    theme: "esperança",
    title: "Amanhã sem pressa mágica",
    scriptureBook: "Lamentações",
    scriptureChapter: 3,
    scriptureStartVerse: 22,
    scriptureEndVerse: 23,
    translationId: null,
    scriptureText: null,
    scriptureReference: "Lamentações 3:22-23",
    paraphrase:
      "Em síntese, as misericórdias de Deus não se esgotam: há fidelidade nova para o dia de hoje, mesmo depois da ruína.",
    reflection:
      "Esperança cristã não é otimismo barato. Lamentações nasce de escombros. Ainda assim afirma que o amor de Deus não acabou com a noite. Se você acordou pesado, o texto não exige um sorriso: oferece um chão. A fidelidade de Deus é diária. Você não precisa resolver a década antes do café.",
    prayer:
      "Senhor, obrigado porque a tua misericórdia não expirou ontem. Sustenta-me neste dia, um passo de cada vez. Amém.",
    action:
      "Nomeie uma misericórdia concreta das últimas 24 horas — mesmo pequena — e agradeça em voz alta.",
    status: "published",
  },
  {
    id: "qa-06-identidade",
    publishDate: "2026-09-19",
    theme: "identidade",
    title: "Amado antes de produzir",
    scriptureBook: "1 João",
    scriptureChapter: 3,
    scriptureStartVerse: 1,
    scriptureEndVerse: 1,
    translationId: null,
    scriptureText: null,
    scriptureReference: "1 João 3:1",
    paraphrase:
      "A passagem ensina que o amor do Pai já nos chama de filhos — um nome dado, não um prêmio por desempenho.",
    reflection:
      "É fácil medir o próprio valor pelo que rendeu hoje. A carta de João corta esse hábito: a identidade cristã começa em ser amado. Isso não anula o chamado à santidade; tira da santidade o veneno da prova constante. Se você falhou, ainda há um nome verdadeiro sobre a sua vida. Comece por aí, não pelo relatório.",
    prayer:
      "Pai, lembra-me de que sou teu. Livra-me de viver só para merecer amor. Que eu responda a ti com verdade. Amém.",
    action:
      "Substitua, por hoje, uma frase interna de condenação por esta: “Sou amado, e posso recomeçar”.",
    status: "published",
  },
  {
    id: "qa-07-coragem",
    publishDate: "2026-09-20",
    theme: "coragem",
    title: "Força para o passo de hoje",
    scriptureBook: "Josué",
    scriptureChapter: 1,
    scriptureStartVerse: 9,
    scriptureEndVerse: 9,
    translationId: null,
    scriptureText: null,
    scriptureReference: "Josué 1:9",
    paraphrase:
      "À luz desse texto, a coragem não nasce de uma personalidade destemida: nasce da certeza de que o Senhor vai com o povo.",
    reflection:
      "Coragem, na Bíblia, raramente é ausência de medo. É obediência com tremor. Josué ouve “não temas” no limiar de uma tarefa grande. Talvez o seu desafio hoje seja menor na aparência e enorme por dentro: uma conversa, uma conta, um começo. Deus não pede que você sinta-se pronto; pede que você não fique parado na porta.",
    prayer:
      "Senhor, eu tenho medo. Vai comigo mesmo assim. Dá-me coragem para o passo de hoje, não para a vida inteira de uma vez. Amém.",
    action:
      "Faça o menor passo visível da tarefa que você está adiando — cinco minutos bastam para começar.",
    status: "published",
  },
] as const;

const IMPORTED_CATALOG = importedCatalog as DailyContent[];

const BY_DATE = new Map(
  DAILY_CONTENT_SEED.filter((item) => item.publishDate).map((item) => [
    item.publishDate as string,
    item,
  ]),
);
for (const item of IMPORTED_CATALOG) {
  if (item.publishDate) BY_DATE.set(item.publishDate, item);
}

export function getDailyContentForDate(isoDate: string): DailyContent {
  const date = isIsoCalendarDate(isoDate) ? isoDate : DAILY_CONTENT_SEED[0]!.publishDate!;
  const exact = BY_DATE.get(date);
  if (exact) return exact;
  const index = calendarDayIndex(date) % DAILY_CONTENT_SEED.length;
  const cycled = DAILY_CONTENT_SEED.at(index) ?? DAILY_CONTENT_SEED[0]!;
  return { ...cycled, publishDate: date };
}

/**
 * Gentle next-day anticipation — title + theme only.
 * Never exposes prayer, paraphrase, or full editorial body.
 */
export function getTomorrowTeaser(isoDate: string): {
  title: string;
  theme: string;
} {
  const tomorrow = addCalendarDays(
    isIsoCalendarDate(isoDate) ? isoDate : DAILY_CONTENT_SEED[0]!.publishDate!,
    1,
  );
  const next = getDailyContentForDate(tomorrow);
  return { title: next.title, theme: next.theme };
}

export function getDailyContentById(id: string): DailyContent | null {
  return (
    IMPORTED_CATALOG.find((item) => item.id === id) ??
    DAILY_CONTENT_SEED.find((item) => item.id === id) ??
    null
  );
}

export function listPublishedDailyContent(): DailyContent[] {
  const fromSeed = DAILY_CONTENT_SEED.filter((item) => item.status === "published");
  const fromImport = IMPORTED_CATALOG.filter((item) => item.status === "published");
  const byId = new Map<string, DailyContent>();
  for (const item of [...fromSeed, ...fromImport]) byId.set(item.id, item);
  return [...byId.values()];
}

export function listDatedPublishedDailyContent(): DailyContent[] {
  return [...BY_DATE.values()].filter((item) => item.status === "published");
}
