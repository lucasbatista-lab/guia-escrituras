/**
 * Heuristics to separate synthetic QA / audit traffic from paid acquisition
 * in operator reports. Does not change what is persisted.
 */

const QA_CAMPAIGN_EXACT = new Set([
  "launch_readiness",
  "capi_final",
  "audit_final",
  "qa",
  "amem_qa",
]);

const QA_CONTENT_EXACT = new Set([
  "audit_final",
  "capi_final",
  "qa",
  "probe",
]);

function looksLikeQaToken(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (!v) return false;
  if (QA_CAMPAIGN_EXACT.has(v) || QA_CONTENT_EXACT.has(v)) return true;
  return (
    v.startsWith("qa_") ||
    v.startsWith("qa-") ||
    v.includes("_qa_") ||
    v.includes("-qa-") ||
    v.startsWith("audit_") ||
    v.startsWith("capi_") ||
    v.includes("launch_readiness")
  );
}

export function isSyntheticQaAcquisition(input: {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
}): boolean {
  const source = input.utm_source?.trim().toLowerCase() ?? "";
  if (source === "qa" || source === "amem-qa" || source === "amem_qa") {
    return true;
  }
  return (
    looksLikeQaToken(input.utm_campaign) || looksLikeQaToken(input.utm_content)
  );
}
