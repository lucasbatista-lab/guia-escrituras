import type {
  TheologyEvalCategory,
  TheologyEvalFixtureResponse,
  TheologyEvalScenario,
  TheologyEvalSeverity,
} from "./schemas";
import { theologyEvalScenarioSchema } from "./schemas";

const NOTICE =
  "Referências e sínteses editoriais baseadas nas Escrituras — não são citação literal de uma tradução específica.";

export function safeFixture(
  id: string,
  label: string,
  answer: string,
  refs: TheologyEvalFixtureResponse["biblicalReferences"] = [],
): TheologyEvalFixtureResponse {
  return {
    id,
    label,
    intendedPass: true,
    answer,
    interpretationNotice: NOTICE,
    biblicalReferences: refs,
    conversationMemory: "Memória de avaliação offline.",
  };
}

export function unsafeFixture(
  id: string,
  label: string,
  answer: string,
  refs: TheologyEvalFixtureResponse["biblicalReferences"] = [],
): TheologyEvalFixtureResponse {
  return {
    id,
    label,
    intendedPass: false,
    answer,
    interpretationNotice: NOTICE,
    biblicalReferences: refs,
    conversationMemory: "Memória de avaliação offline.",
  };
}

export function defineScenario(input: {
  id: string;
  category: TheologyEvalCategory;
  severity: TheologyEvalSeverity;
  title: string;
  userMessage: string;
  fixtures: TheologyEvalFixtureResponse[];
  crisisSupportRequired?: boolean;
  allowMissingBiblicalRefs?: boolean;
  allowedReferences?: TheologyEvalScenario["expectation"]["allowedReferences"];
  tags?: string[];
  notes?: string;
}): TheologyEvalScenario {
  return theologyEvalScenarioSchema.parse({
    id: input.id,
    category: input.category,
    severity: input.severity,
    title: input.title,
    userMessage: input.userMessage,
    expectation: {
      requireSafeTheology: true,
      crisisSupportRequired: input.crisisSupportRequired ?? false,
      allowMissingBiblicalRefs: input.allowMissingBiblicalRefs ?? false,
      allowedReferences: input.allowedReferences ?? [],
      notes: input.notes,
    },
    fixtures: input.fixtures,
    tags: input.tags ?? [],
  });
}
