import "server-only";

export const META_CAPI_EVENTS = ["InitiateCheckout", "Purchase"] as const;

export type MetaCapiEventName = (typeof META_CAPI_EVENTS)[number];

export type MetaCapiCustomData = {
  value?: number;
  currency?: string;
};

export type MetaCapiUserData = {
  /** Plaintext email — hashed server-side; never sent to Meta. */
  email?: string;
  /** Pre-computed SHA-256 hex email hash. */
  emHash?: string;
  /** Stable internal user UUID — hashed server-side. */
  userId?: string;
  /** Pre-computed SHA-256 hex external_id hash. */
  externalIdHash?: string;
  fbp?: string;
  fbc?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
};

export type MetaCapiEventInput = {
  eventName: MetaCapiEventName;
  eventId: string;
  eventTime: number;
  eventSourceUrl: string | null;
  actionSource: "website";
  userData?: MetaCapiUserData;
  customData?: MetaCapiCustomData;
};

export type MetaCapiSendResult =
  | { status: "disabled"; reason: string }
  | { status: "sent"; eventName: MetaCapiEventName; eventId: string }
  | {
      status: "rejected";
      eventName: MetaCapiEventName;
      eventId: string;
      code: string;
    }
  | {
      status: "failed";
      eventName: MetaCapiEventName;
      eventId: string;
      code: string;
    };

export function isMetaCapiEventName(
  value: string,
): value is MetaCapiEventName {
  return (META_CAPI_EVENTS as readonly string[]).includes(value);
}
