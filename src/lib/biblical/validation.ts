const CANONICAL_BOOKS = [
  "Gênesis",
  "Êxodo",
  "Levítico",
  "Números",
  "Deuteronômio",
  "Josué",
  "Juízes",
  "Rute",
  "1 Samuel",
  "2 Samuel",
  "1 Reis",
  "2 Reis",
  "1 Crônicas",
  "2 Crônicas",
  "Esdras",
  "Neemias",
  "Ester",
  "Jó",
  "Salmos",
  "Provérbios",
  "Eclesiastes",
  "Cânticos",
  "Isaías",
  "Jeremias",
  "Lamentações",
  "Ezequiel",
  "Daniel",
  "Oséias",
  "Joel",
  "Amós",
  "Obadias",
  "Jonas",
  "Miquéias",
  "Naum",
  "Habacuque",
  "Sofonias",
  "Ageu",
  "Zacarias",
  "Malaquias",
  "Mateus",
  "Marcos",
  "Lucas",
  "João",
  "Atos",
  "Romanos",
  "1 Coríntios",
  "2 Coríntios",
  "Gálatas",
  "Efésios",
  "Filipenses",
  "Colossenses",
  "1 Tessalonicenses",
  "2 Tessalonicenses",
  "1 Timóteo",
  "2 Timóteo",
  "Tito",
  "Filemom",
  "Hebreus",
  "Tiago",
  "1 Pedro",
  "2 Pedro",
  "1 João",
  "2 João",
  "3 João",
  "Judas",
  "Apocalipse",
] as const;

const BOOK_SET = new Set(
  CANONICAL_BOOKS.map((book) => book.toLowerCase()),
);

export function validateBiblicalReference(reference: {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!reference.book.trim()) {
    errors.push("Livro é obrigatório.");
  } else if (!BOOK_SET.has(reference.book.trim().toLowerCase())) {
    errors.push(`Livro não reconhecido: ${reference.book}`);
  }

  if (!Number.isInteger(reference.chapter) || reference.chapter < 1) {
    errors.push("Capítulo deve ser um inteiro >= 1.");
  }

  if (!Number.isInteger(reference.verseStart) || reference.verseStart < 1) {
    errors.push("Versículo inicial deve ser um inteiro >= 1.");
  }

  if (
    reference.verseEnd !== undefined &&
    (!Number.isInteger(reference.verseEnd) ||
      reference.verseEnd < reference.verseStart)
  ) {
    errors.push(
      "Versículo final deve ser um inteiro >= versículo inicial.",
    );
  }

  return { valid: errors.length === 0, errors };
}

export function formatBiblicalReference(reference: {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}): string {
  if (
    reference.verseEnd &&
    reference.verseEnd !== reference.verseStart
  ) {
    return `${reference.book} ${reference.chapter}:${reference.verseStart}-${reference.verseEnd}`;
  }
  return `${reference.book} ${reference.chapter}:${reference.verseStart}`;
}

export { CANONICAL_BOOKS };
