import { brand } from "@/config/brand";
import type { DailyContent } from "./types";

export function buildDailyShareText(input: {
  content: DailyContent;
  shareUrl: string;
}): string {
  const { content, shareUrl } = input;
  return [
    content.scriptureReference,
    content.paraphrase,
    "",
    "Oração de hoje",
    content.prayer,
    "",
    "Um passo",
    content.action,
    "",
    brand.name,
    shareUrl,
  ].join("\n");
}

export function buildDailyShareUrl(isoDate: string, origin: string): string {
  const url = new URL(`/hoje/${isoDate}`, origin);
  url.searchParams.set("utm_source", "share");
  url.searchParams.set("utm_medium", "organic");
  url.searchParams.set("utm_content", "daily_share");
  return url.toString();
}

/** Public payload only — never check-in, account, or private prayer. */
export function publicDailyShareFields(content: DailyContent): {
  reference: string;
  paraphrase: string;
  prayer: string;
  action: string;
  brand: string;
} {
  return {
    reference: content.scriptureReference,
    paraphrase: content.paraphrase,
    prayer: content.prayer,
    action: content.action,
    brand: brand.name,
  };
}
