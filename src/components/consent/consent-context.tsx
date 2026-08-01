"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  clearAdvertisingCookies,
  hasAdvertisingConsent,
  readStoredConsent,
  writeStoredConsent,
  type ConsentRecord,
} from "@/lib/consent";

type ConsentContextValue = {
  ready: boolean;
  record: ConsentRecord | null;
  advertisingGranted: boolean;
  bannerVisible: boolean;
  preferencesOpen: boolean;
  acceptAdvertising: () => void;
  refuseAdvertising: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
  saveAdvertisingPreference: (granted: boolean) => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

const consentListeners = new Set<() => void>();
let cachedRecord: ConsentRecord | null | undefined;
let cachedSerialized = "";

function emitConsentStore() {
  cachedRecord = undefined;
  cachedSerialized = "";
  for (const listener of consentListeners) listener();
}

function subscribeConsent(listener: () => void) {
  consentListeners.add(listener);
  return () => {
    consentListeners.delete(listener);
  };
}

function getConsentSnapshot(): ConsentRecord | null {
  const next = readStoredConsent();
  const serialized = next ? JSON.stringify(next) : "";
  if (cachedRecord !== undefined && serialized === cachedSerialized) {
    return cachedRecord;
  }
  cachedRecord = next;
  cachedSerialized = serialized;
  return cachedRecord;
}

function getConsentServerSnapshot(): ConsentRecord | null {
  return null;
}

function subscribeReady(listener: () => void) {
  // Client is immediately ready; keep a no-op subscription shape.
  void listener;
  return () => {};
}

function setBannerOpenAttr(open: boolean) {
  if (typeof document === "undefined") return;
  if (open) {
    document.documentElement.setAttribute("data-consent-banner-open", "true");
  } else {
    document.documentElement.removeAttribute("data-consent-banner-open");
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const record = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const bannerVisible = ready && !record && !bannerDismissed && !preferencesOpen;

  useEffect(() => {
    setBannerOpenAttr(bannerVisible || preferencesOpen);
    return () => setBannerOpenAttr(false);
  }, [bannerVisible, preferencesOpen]);

  const persist = useCallback((granted: boolean) => {
    writeStoredConsent(granted ? "granted" : "denied");
    setBannerDismissed(true);
    setPreferencesOpen(false);
    if (!granted) {
      clearAdvertisingCookies();
    }
    emitConsentStore();
    window.dispatchEvent(
      new CustomEvent("amem:consent-changed", {
        detail: { advertising: granted ? "granted" : "denied" },
      }),
    );
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      ready,
      record,
      advertisingGranted: hasAdvertisingConsent(record),
      bannerVisible,
      preferencesOpen,
      acceptAdvertising: () => persist(true),
      refuseAdvertising: () => persist(false),
      openPreferences: () => {
        setPreferencesOpen(true);
        setBannerDismissed(true);
      },
      closePreferences: () => setPreferencesOpen(false),
      saveAdvertisingPreference: (granted: boolean) => persist(granted),
    }),
    [bannerVisible, persist, preferencesOpen, ready, record],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return ctx;
}

/** Safe for optional surfaces that may render outside the provider in tests. */
export function useConsentOptional(): ConsentContextValue | null {
  return useContext(ConsentContext);
}
