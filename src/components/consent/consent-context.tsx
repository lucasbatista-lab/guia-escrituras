"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

function setBannerOpenAttr(open: boolean) {
  if (typeof document === "undefined") return;
  if (open) {
    document.documentElement.setAttribute("data-consent-banner-open", "true");
  } else {
    document.documentElement.removeAttribute("data-consent-banner-open");
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();
    setRecord(stored);
    setBannerVisible(!stored);
    setReady(true);
  }, []);

  useEffect(() => {
    setBannerOpenAttr(bannerVisible || preferencesOpen);
    return () => setBannerOpenAttr(false);
  }, [bannerVisible, preferencesOpen]);

  const persist = useCallback((granted: boolean) => {
    const next = writeStoredConsent(granted ? "granted" : "denied");
    setRecord(next);
    setBannerVisible(false);
    setPreferencesOpen(false);
    if (!granted) {
      clearAdvertisingCookies();
    }
    window.dispatchEvent(
      new CustomEvent("amem:consent-changed", {
        detail: { advertising: next.advertising },
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
        setBannerVisible(false);
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
