import { z } from "zod";

export const theologyEvalCategorySchema = z.enum([
  "identity",
  "revelation",
  "healing",
  "prosperity",
  "hate_exclusion",
  "guilt_forgiveness",
  "mental_health_crisis",
  "grounding",
  "jailbreak",
  "common_situations",
]);

export const theologyEvalSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export const theologyEvalModeSchema = z.enum(["fixture", "offline_mock"]);

export const theologyEvalRuleIdSchema = z.enum([
  "no_divine_personification",
  "no_affirmative_revelation",
  "no_guaranteed_healing",
  "no_abandon_medical_care",
  "no_guaranteed_prosperity",
  "no_hate_or_dehumanization",
  "no_spiritual_fear_manipulation",
  "no_fabricated_biblical_refs",
  "no_unretrieved_biblical_refs",
  "no_false_literal_citation",
  "no_prompt_or_secret_leak",
  "no_self_harm_encouragement",
  "crisis_requires_human_support",
  "output_schema_valid",
  "quality_welcoming",
  "quality_humble",
  "quality_hope_without_promise",
  "quality_personal_responsibility",
  "quality_respects_limits",
  "quality_context_coherence",
  "quality_adult_language",
  "quality_relevant_grounding",
  "quality_reflection_clarity",
  "quality_professional_referral",
]);

export const biblicalRefHitSchema = z.object({
  raw: z.string(),
  book: z.string(),
  chapter: z.number().int().positive(),
  verseStart: z.number().int().positive(),
  verseEnd: z.number().int().positive().optional(),
  canonical: z.boolean(),
});

export const theologyEvalExpectationSchema = z.object({
  /** Scenario expects the model to refuse divine identity / unsafe claims. */
  requireSafeTheology: z.boolean().default(true),
  /** Crisis cases must mention human/professional support. */
  crisisSupportRequired: z.boolean().default(false),
  /** Grounding checks can be skipped when no cite is needed. */
  allowMissingBiblicalRefs: z.boolean().default(false),
  /** Optional: structured refs that would be "allowed" for fixture grounding checks. */
  allowedReferences: z
    .array(
      z.object({
        book: z.string(),
        chapter: z.number().int().positive(),
        verseStart: z.number().int().positive(),
        verseEnd: z.number().int().positive().optional(),
      }),
    )
    .default([]),
  notes: z.string().optional(),
});

export const theologyEvalFixtureResponseSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Whether this fixture is editorialy intended to pass the rubric. */
  intendedPass: z.boolean(),
  answer: z.string().min(1).max(12_000),
  interpretationNotice: z.string().default(
    "Referências e sínteses editoriais baseadas nas Escrituras — não são citação literal de uma tradução específica.",
  ),
  biblicalReferences: z
    .array(
      z.object({
        book: z.string(),
        chapter: z.number().int().positive(),
        verseStart: z.number().int().positive(),
        verseEnd: z.number().int().positive().optional(),
      }),
    )
    .default([]),
  followUpQuestion: z.string().optional(),
  conversationMemory: z.string().default("Memória de avaliação offline."),
});

export const theologyEvalScenarioSchema = z.object({
  id: z.string().min(1),
  category: theologyEvalCategorySchema,
  severity: theologyEvalSeveritySchema,
  title: z.string().min(1),
  userMessage: z.string().min(1),
  expectation: theologyEvalExpectationSchema,
  fixtures: z.array(theologyEvalFixtureResponseSchema).min(1),
  tags: z.array(z.string()).default([]),
});

export const dimensionScoreSchema = z.object({
  dimension: z.string(),
  score: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export const triggeredRuleSchema = z.object({
  ruleId: theologyEvalRuleIdSchema,
  passed: z.boolean(),
  critical: z.boolean(),
  evidence: z.array(z.string()).max(6),
});

export const theologyEvalResultSchema = z.object({
  scenarioId: z.string(),
  fixtureId: z.string().nullable(),
  mode: theologyEvalModeSchema,
  category: theologyEvalCategorySchema,
  severity: theologyEvalSeveritySchema,
  pass: z.boolean(),
  criticalFailure: z.boolean(),
  rules: z.array(triggeredRuleSchema),
  dimensionScores: z.array(dimensionScoreSchema),
  detectedReferences: z.array(biblicalRefHitSchema),
  allowedReferences: z.array(biblicalRefHitSchema),
  invalidReferences: z.array(biblicalRefHitSchema),
  unretrievedReferences: z.array(biblicalRefHitSchema),
  investigationRecommendations: z.array(z.string()),
  answerExcerpt: z.string().max(280),
  providerLabel: z.string(),
});

export const theologyEvalReportSchema = z.object({
  generatedAt: z.string(),
  mode: z.enum(["full", "ci"]),
  providerNote: z.string(),
  totals: z.object({
    scenarios: z.number().int().nonnegative(),
    evaluations: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    criticalFailures: z.number().int().nonnegative(),
  }),
  byCategory: z.record(
    z.string(),
    z.object({
      total: z.number(),
      passed: z.number(),
      failed: z.number(),
    }),
  ),
  byMode: z.object({
    fixture: z.object({ total: z.number(), passed: z.number(), failed: z.number() }),
    offline_mock: z.object({
      total: z.number(),
      passed: z.number(),
      failed: z.number(),
    }),
  }),
  topTriggeredRules: z.array(
    z.object({ ruleId: z.string(), failCount: z.number() }),
  ),
  dimensionAverages: z.record(z.string(), z.number()),
  criticalFailures: z.array(theologyEvalResultSchema),
  pipelineGaps: z.array(z.string()),
  nextActions: z.array(z.string()),
  results: z.array(theologyEvalResultSchema),
});

export type TheologyEvalCategory = z.infer<typeof theologyEvalCategorySchema>;
export type TheologyEvalSeverity = z.infer<typeof theologyEvalSeveritySchema>;
export type TheologyEvalMode = z.infer<typeof theologyEvalModeSchema>;
export type TheologyEvalRuleId = z.infer<typeof theologyEvalRuleIdSchema>;
export type BiblicalRefHit = z.infer<typeof biblicalRefHitSchema>;
export type TheologyEvalScenario = z.infer<typeof theologyEvalScenarioSchema>;
export type TheologyEvalFixtureResponse = z.infer<
  typeof theologyEvalFixtureResponseSchema
>;
export type TheologyEvalResult = z.infer<typeof theologyEvalResultSchema>;
export type TheologyEvalReport = z.infer<typeof theologyEvalReportSchema>;
export type TriggeredRule = z.infer<typeof triggeredRuleSchema>;
