export interface BiblicalReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  translation?: string;
}

export interface BiblicalPassage {
  reference: BiblicalReference;
  text: string;
  /** True when text is illustrative mock, never a licensed translation. */
  isMock: boolean;
  displayLabel: string;
}

export interface BiblicalSourceProvider {
  getPassage(reference: BiblicalReference): Promise<BiblicalPassage | null>;
  validateReference(reference: BiblicalReference): {
    valid: boolean;
    errors: string[];
  };
}
