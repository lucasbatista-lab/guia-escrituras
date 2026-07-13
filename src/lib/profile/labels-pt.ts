import type { PreferredDepth, ResponseStyle, TraditionKey } from "@/lib/theology";
import { getTraditionPolicy } from "@/lib/theology";

const STYLE_LABELS: Record<ResponseStyle, string> = {
  reflective: "Reflexivo",
  pastoral: "Pastoral",
  practical: "Prático",
  study: "Estudo",
};

const DEPTH_LABELS: Record<PreferredDepth, string> = {
  brief: "Breve",
  balanced: "Equilibrada",
  deep: "Aprofundada",
};

export function traditionLabelPt(key: string | null | undefined): string {
  if (!key) return "Não definida";
  return getTraditionPolicy(key as TraditionKey)?.label ?? "Não definida";
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
