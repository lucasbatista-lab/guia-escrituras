/**
 * Safe process.env isolation for Vitest.
 *
 * Never assign `process.env = { ... }` — Node's env object is special, and
 * replacing it races under file-parallel test runs.
 */

export function snapshotEnv(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return { ...env };
}

export function restoreEnv(snapshot: NodeJS.ProcessEnv): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
