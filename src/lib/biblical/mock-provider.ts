import type {
  BiblicalPassage,
  BiblicalReference,
  BiblicalSourceProvider,
} from "./types";
import { formatBiblicalReference, validateBiblicalReference } from "./validation";

/**
 * Provider mock — trechos fictícios apenas para demonstração de UI/fluxo.
 * Nunca apresentar como citação de tradução real.
 */
const MOCK_PASSAGES: BiblicalPassage[] = [
  {
    reference: {
      book: "Mateus",
      chapter: 11,
      verseStart: 28,
      verseEnd: 30,
    },
    text: "[Demonstração] Vinde a mim, todos os que estais cansados… — trecho fictício para layout.",
    isMock: true,
    displayLabel: "demonstração",
  },
  {
    reference: {
      book: "João",
      chapter: 14,
      verseStart: 27,
    },
    text: "[Demonstração] Deixo-vos a paz… — trecho fictício para layout.",
    isMock: true,
    displayLabel: "demonstração",
  },
  {
    reference: {
      book: "Salmos",
      chapter: 23,
      verseStart: 1,
      verseEnd: 3,
    },
    text: "[Demonstração] O Senhor é meu pastor… — trecho fictício para layout.",
    isMock: true,
    displayLabel: "demonstração",
  },
];

export class MockBiblicalSourceProvider implements BiblicalSourceProvider {
  validateReference(reference: BiblicalReference) {
    return validateBiblicalReference(reference);
  }

  async getPassage(
    reference: BiblicalReference,
  ): Promise<BiblicalPassage | null> {
    const validation = this.validateReference(reference);
    if (!validation.valid) return null;

    const exact = MOCK_PASSAGES.find(
      (passage) =>
        passage.reference.book.toLowerCase() ===
          reference.book.toLowerCase() &&
        passage.reference.chapter === reference.chapter &&
        passage.reference.verseStart === reference.verseStart,
    );

    if (exact) return exact;

    return {
      reference,
      text: `[Demonstração] Passagem ilustrativa para ${formatBiblicalReference(reference)}. Texto fictício — não é citação de tradução licenciada.`,
      isMock: true,
      displayLabel: "demonstração",
    };
  }
}

export const mockBiblicalSource = new MockBiblicalSourceProvider();
