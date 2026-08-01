import "server-only";

export type MetaCapiConfig =
  | {
      enabled: true;
      pixelId: string;
      accessToken: string;
      graphVersion: string;
      testEventCode: string | null;
    }
  | {
      enabled: false;
      reason: string;
    };

function truthyFlag(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Resolve CAPI configuration. Missing Graph API version disables CAPI —
 * we never guess a version.
 */
export function resolveMetaCapiConfig(): MetaCapiConfig {
  if (!truthyFlag(process.env.META_ADS_ENABLED)) {
    return { enabled: false, reason: "meta_ads_disabled" };
  }

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
  if (!/^\d{5,20}$/.test(pixelId)) {
    return { enabled: false, reason: "pixel_id_missing" };
  }

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim() || "";
  if (!accessToken) {
    return { enabled: false, reason: "capi_token_missing" };
  }

  const graphVersion = process.env.META_GRAPH_API_VERSION?.trim() || "";
  if (!/^v\d+\.\d+$/.test(graphVersion)) {
    return { enabled: false, reason: "graph_version_missing" };
  }

  const testEventCode =
    process.env.META_CAPI_TEST_EVENT_CODE?.trim() || null;

  return {
    enabled: true,
    pixelId,
    accessToken,
    graphVersion,
    testEventCode,
  };
}
