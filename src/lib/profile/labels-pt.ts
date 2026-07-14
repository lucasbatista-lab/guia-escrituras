import type { PreferredDepth, ResponseStyle, TraditionKey } from "@/lib/theology";
import {
  PERSONALIZATION_DEPTHS,
  PERSONALIZATION_STYLES,
  PERSONALIZATION_TRADITIONS,
} from "@/lib/journey/personalization-labels";

const TRADITION_LABELS: Partial<Record<TraditionKey, string>> =
  Object.fromEntries(
    PERSONALIZATION_TRADITIONS.map((t) => [t.key, t.label]),
  );

const STYLE_LABELS: Partial<Record<ResponseStyle, string>> = {
  ...Object.fromEntries(
    PERSONALIZATION_STYLES.map((s) => [s.key, s.label]),
  ),
  pastoral: "Pastoral",
};

const DEPTH_LABELS: Partial<Record<PreferredDepth, string>> =
  Object.fromEntries(PERSONALIZATION_DEPTHS.map((d) => [d.key, d.label]));

export function traditionLabelPt(key: string | null | undefined): string {
  if (!key) return "Não definida";
  return TRADITION_LABELS[key as TraditionKey] ?? "Não definida";
}

export function responseStyleLabelPt(
  style: string | null | undefined,
): string {
  if (!style) return "Não definido";
  return STYLE_LABELS[style as ResponseStyle] ?? "Não definido";
}

export function preferredDepthLabelPt(
  depth: string | null | undefined,
): string {
  if (!depth) return "Não definida";
  return DEPTH_LABELS[depth as PreferredDepth] ?? "Não definida";
}
