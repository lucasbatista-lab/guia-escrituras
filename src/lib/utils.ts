import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export {
  getSupabaseAnonKey,
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabaseEnv,
  hasSupabasePublicEnv,
} from "@/lib/supabase/keys";

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function currentYearMonth(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
