import { timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/safety";

/**
 * Authenticate Vercel Cron (or manual curl) via CRON_SECRET.
 * Accepts Authorization: Bearer <secret> or x-cron-secret: <secret>.
 * Never logs the secret.
 */
export function getCronSecret(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env.CRON_SECRET?.trim();
  return raw ? raw : null;
}

function readPresentedSecret(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const alt = request.headers.get("x-cron-secret")?.trim();
  return alt || null;
}

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    // Compare against self to keep runtime roughly constant on length mismatch.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function assertCronAuthorized(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const expected = getCronSecret(env);
  if (!expected) {
    throw new AppError(
      "cron_not_configured",
      "cron_not_configured",
      503,
      "Agendamento indisponível.",
    );
  }
  const presented = readPresentedSecret(request);
  if (!presented || !safeEqualString(presented, expected)) {
    throw new AppError(
      "cron_unauthorized",
      "cron_unauthorized",
      401,
      "Não autorizado.",
    );
  }
}
