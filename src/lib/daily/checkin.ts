export const DAILY_CHECKIN_VALUES = [
  "grateful",
  "peaceful",
  "anxious",
  "tired",
  "lost",
  "hopeful",
] as const;

export type DailyCheckinValue = (typeof DAILY_CHECKIN_VALUES)[number];

export const DAILY_CHECKIN_LABELS: Record<DailyCheckinValue, string> = {
  grateful: "Grato",
  peaceful: "Em paz",
  anxious: "Ansioso",
  tired: "Cansado",
  lost: "Perdido",
  hopeful: "Esperançoso",
};

export function isDailyCheckinValue(
  value: string | null | undefined,
): value is DailyCheckinValue {
  return (
    typeof value === "string" &&
    (DAILY_CHECKIN_VALUES as readonly string[]).includes(value)
  );
}
