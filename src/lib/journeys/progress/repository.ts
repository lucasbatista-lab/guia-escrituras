import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  JourneyProgressRecord,
  JourneyProgressRepository,
} from "./types";
import { JourneyProgressError } from "./types";

type DbRow = {
  user_id: string;
  journey_slug: string;
  version: number;
  completed_step_ids: string[] | null;
  current_step_id: string | null;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
};

function mapRow(row: DbRow): JourneyProgressRecord {
  return {
    userId: row.user_id,
    journeySlug: row.journey_slug,
    version: row.version,
    completedStepIds: Array.isArray(row.completed_step_ids)
      ? [...row.completed_step_ids]
      : [],
    currentStepId: row.current_step_id,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

/**
 * Trusted backend repository. Uses service role + RPC for atomic merges.
 * Always filter by server-resolved userId — never trust client-supplied ids alone.
 * Not wired into production routes in Persistence Foundation V1.
 */
export class SupabaseJourneyProgressRepository
  implements JourneyProgressRepository
{
  async get(
    userId: string,
    journeySlug: string,
  ): Promise<JourneyProgressRecord | null> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("journey_progress")
      .select(
        "user_id, journey_slug, version, completed_step_ids, current_step_id, started_at, updated_at, completed_at",
      )
      .eq("user_id", userId)
      .eq("journey_slug", journeySlug.trim())
      .maybeSingle();

    if (error) {
      throw new JourneyProgressError(error.message);
    }
    if (!data) return null;
    return mapRow(data as DbRow);
  }

  async list(userId: string): Promise<JourneyProgressRecord[]> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("journey_progress")
      .select(
        "user_id, journey_slug, version, completed_step_ids, current_step_id, started_at, updated_at, completed_at",
      )
      .eq("user_id", userId)
      .order("journey_slug", { ascending: true });

    if (error) {
      throw new JourneyProgressError(error.message);
    }
    return (data ?? []).map((row) => mapRow(row as DbRow));
  }

  async start(
    userId: string,
    journeySlug: string,
    firstStepId: string,
  ): Promise<JourneyProgressRecord> {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("start_journey_progress", {
      p_user_id: userId,
      p_journey_slug: journeySlug.trim(),
      p_first_step_id: firstStepId.trim(),
    });

    if (error) {
      throw new JourneyProgressError(error.message);
    }
    if (!data) {
      throw new JourneyProgressError("start returned empty", "persist_failed");
    }
    return mapRow(data as DbRow);
  }

  async completeStep(input: {
    userId: string;
    journeySlug: string;
    stepId: string;
    nextStepId: string | null;
    totalStepIds: string[];
  }): Promise<JourneyProgressRecord> {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("complete_journey_progress_step", {
      p_user_id: input.userId,
      p_journey_slug: input.journeySlug.trim(),
      p_step_id: input.stepId.trim(),
      p_next_step_id: input.nextStepId?.trim() || null,
      p_total_step_ids: input.totalStepIds,
    });

    if (error) {
      throw new JourneyProgressError(error.message);
    }
    if (!data) {
      throw new JourneyProgressError(
        "completeStep returned empty",
        "persist_failed",
      );
    }
    return mapRow(data as DbRow);
  }

  async reset(
    userId: string,
    journeySlug: string,
  ): Promise<JourneyProgressRecord> {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("reset_journey_progress", {
      p_user_id: userId,
      p_journey_slug: journeySlug.trim(),
    });

    if (error) {
      throw new JourneyProgressError(error.message);
    }
    if (!data) {
      throw new JourneyProgressError("reset returned empty", "persist_failed");
    }
    return mapRow(data as DbRow);
  }
}

let overrideRepo: JourneyProgressRepository | null = null;

export function setJourneyProgressRepositoryForTests(
  repo: JourneyProgressRepository | null,
): void {
  overrideRepo = repo;
}

/**
 * Factory for future feature wiring. Persistence Foundation V1 keeps this
 * unused by routes/export so production never queries the table before apply.
 */
export function getJourneyProgressRepository(): JourneyProgressRepository {
  if (overrideRepo) return overrideRepo;
  return new SupabaseJourneyProgressRepository();
}
