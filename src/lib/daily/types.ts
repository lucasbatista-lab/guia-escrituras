import type { DailyCheckinValue } from "./checkin";

export type DailyContentStatus = "published" | "draft";

/**
 * Bible-ready editorial daily content.
 * scriptureText is optional editorial paraphrase — never a licensed modern translation.
 */
export interface DailyContent {
  id: string;
  publishDate: string | null;
  theme: string;
  title: string;
  scriptureBook: string;
  scriptureChapter: number;
  scriptureStartVerse: number;
  scriptureEndVerse: number | null;
  translationId: string | null;
  scriptureText: string | null;
  scriptureReference: string;
  paraphrase: string;
  reflection: string;
  prayer: string;
  action: string;
  status: DailyContentStatus;
}

export interface UserDailyInteraction {
  localDate: string;
  viewedAt: string | null;
  completedAt: string | null;
  savedAt: string | null;
  sharedAt: string | null;
  checkin: DailyCheckinValue | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyInteractionPatch {
  localDate: string;
  viewed?: boolean;
  completed?: boolean;
  saved?: boolean;
  shared?: boolean;
  checkin?: DailyCheckinValue | null;
}

export interface DailyTodayPayload {
  date: string;
  timezone: "America/Sao_Paulo";
  content: DailyContent;
  interaction: UserDailyInteraction | null;
}
