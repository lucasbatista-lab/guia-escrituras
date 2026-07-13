import { allowsMocks } from "@/config/runtime";
import { CuratedBiblicalProvider } from "./curated-provider";
import type { BiblicalGroundingProvider } from "./curated-types";
import { AppError } from "@/lib/safety";

/**
 * Always returns CuratedBiblicalProvider for chat grounding.
 * MockBiblicalSourceProvider is never used in production or chat flows.
 */
export function createBiblicalGroundingProvider(): BiblicalGroundingProvider {
  const provider = new CuratedBiblicalProvider();

  try {
    provider.assertCorpusReady();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "biblical_corpus_unavailable",
      "biblical_corpus_unavailable",
      503,
      "O chat está temporariamente indisponível. Tente novamente mais tarde.",
    );
  }

  // Demo/mocks may still use MockAiProvider for generation, but biblical
  // grounding remains curated even when allowsMocks() is true.
  void allowsMocks;

  return provider;
}

export function isProductionBiblicalProvider(
  provider: BiblicalGroundingProvider,
): boolean {
  return provider.providerId === "curated_v1";
}
