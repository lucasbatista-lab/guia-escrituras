import "server-only";

export const META_CAPI_EVENTS = ["InitiateCheckout", "Purchase"] as const;

export type MetaCapiEventName = (typeof META_CAPI_EVENTS)[number];

export type MetaCapiCustomData = {
  value?: number;
  currency?: string;
};

export type MetaCapiUserData = {
  fbp?: string;
  fbc?: string;
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
