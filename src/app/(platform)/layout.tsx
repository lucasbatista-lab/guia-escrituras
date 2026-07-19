import type { Metadata } from "next";
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
    <div className="min-h-screen">
      <PlatformNav items={navItems} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
