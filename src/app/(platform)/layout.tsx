import type { Metadata } from "next";
import { MAIN_CONTENT_ID } from "@/components/a11y/main-content-id";
import { PlatformNav } from "@/components/platform/platform-nav";
import {
  getPlatformNavItemsForState,
  resolveUserJourneyState,
} from "@/lib/journey";
import { privateRobotsMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: "Espaço pessoal",
};

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const journey = await resolveUserJourneyState();
  const navItems = getPlatformNavItemsForState(journey.state);

  return (
    <div className="min-h-app">
      <PlatformNav items={navItems} />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-4 py-8 outline-none sm:px-6 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}
