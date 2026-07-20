import type { JourneyProgressRecord } from "./types";
import { JourneyProgressError } from "./types";

function key(userId: string, journeySlug: string): string {
  return `${userId}::${journeySlug}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function clone(record: JourneyProgressRecord): JourneyProgressRecord {
  return {
    ...record,
    completedStepIds: [...record.completedStepIds],
  };
}

/**
 * In-memory repository for unit tests — mirrors atomic merge semantics of the SQL RPCs.
 * Mutations for the same (user, slug) are serialized to avoid lost updates under Promise.all.
 */
export class MemoryJourneyProgressRepository {
  private readonly rows = new Map<string, JourneyProgressRecord>();
  private readonly locks = new Map<string, Promise<void>>();

  clear(): void {
    this.rows.clear();
    this.locks.clear();
  }

  private async withLock<T>(k: string, fn: () => T | Promise<T>): Promise<T> {
    const prev = this.locks.get(k) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(
      k,
      prev.then(() => gate),
    );
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  async get(
    userId: string,
    journeySlug: string,
  ): Promise<JourneyProgressRecord | null> {
    const row = this.rows.get(key(userId, journeySlug));
    return row ? clone(row) : null;
  }

  async list(userId: string): Promise<JourneyProgressRecord[]> {
    return Array.from(this.rows.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => a.journeySlug.localeCompare(b.journeySlug))
      .map(clone);
  }

  async start(
    userId: string,
    journeySlug: string,
    firstStepId: string,
  ): Promise<JourneyProgressRecord> {
    const k = key(userId, journeySlug.trim());
    return this.withLock(k, () => {
      const existing = this.rows.get(k);
      if (existing) {
        if (!existing.currentStepId && firstStepId.trim()) {
          existing.currentStepId = firstStepId.trim();
          existing.updatedAt = nowIso();
        }
        return clone(existing);
      }
      const ts = nowIso();
      const created: JourneyProgressRecord = {
        userId,
        journeySlug: journeySlug.trim(),
        version: 1,
        completedStepIds: [],
        currentStepId: firstStepId.trim() || null,
        startedAt: ts,
        updatedAt: ts,
        completedAt: null,
      };
      this.rows.set(k, created);
      return clone(created);
    });
  }

  async completeStep(input: {
    userId: string;
    journeySlug: string;
    stepId: string;
    nextStepId: string | null;
    totalStepIds: string[];
  }): Promise<JourneyProgressRecord> {
    const slug = input.journeySlug.trim();
    const step = input.stepId.trim();
    if (!slug || !step) {
      throw new JourneyProgressError("slug/step required", "invalid_input");
    }
    const k = key(input.userId, slug);
    return this.withLock(k, () => {
      let row = this.rows.get(k);
      const ts = nowIso();
      if (!row) {
        row = {
          userId: input.userId,
          journeySlug: slug,
          version: 1,
          completedStepIds: [],
          currentStepId: null,
          startedAt: ts,
          updatedAt: ts,
          completedAt: null,
        };
        this.rows.set(k, row);
      }

      const merged = normalizeIds([...row.completedStepIds, step]);
      const expected = normalizeIds(input.totalStepIds);
      const allDone =
        expected.length > 0 && expected.every((id) => merged.includes(id));

      row.completedStepIds = merged;
      row.updatedAt = ts;
      if (allDone) {
        row.currentStepId = null;
        row.completedAt = row.completedAt ?? ts;
      } else {
        const next = input.nextStepId?.trim();
        row.currentStepId = next || row.currentStepId;
      }
      return clone(row);
    });
  }

  async reset(
    userId: string,
    journeySlug: string,
  ): Promise<JourneyProgressRecord> {
    const slug = journeySlug.trim();
    const k = key(userId, slug);
    return this.withLock(k, () => {
      const ts = nowIso();
      const existing = this.rows.get(k);
      const reset: JourneyProgressRecord = {
        userId,
        journeySlug: slug,
        version: existing?.version ?? 1,
        completedStepIds: [],
        currentStepId: null,
        startedAt: ts,
        updatedAt: ts,
        completedAt: null,
      };
      this.rows.set(k, reset);
      return clone(reset);
    });
  }
}
