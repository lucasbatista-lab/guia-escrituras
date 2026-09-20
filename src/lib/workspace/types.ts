export const PRAYER_MAX_LEN = 2000;
export const JOURNAL_MAX_LEN = 4000;

export type PrayerStatus = "open" | "answered";

export interface UserPrayer {
  id: string;
  body: string;
  status: PrayerStatus;
  createdAt: string;
  updatedAt: string;
  answeredAt: string | null;
}

export type SavedItemType =
  | "daily"
  | "journey_step"
  | "editorial_prayer"
  | "passage";

export interface SavedItem {
  id: string;
  itemType: SavedItemType;
  itemKey: string;
  createdAt: string;
  title: string;
  href: string | null;
}

export type PrivateEntryKind = "journal" | "gratitude" | "journey_step";

export interface PrivateEntry {
  id: string;
  kind: PrivateEntryKind;
  body: string;
  localDate: string | null;
  journeySlug: string | null;
  stepId: string | null;
  createdAt: string;
  updatedAt: string;
}
