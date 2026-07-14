import { PlatformNav } from "@/components/platform/platform-nav";
import {
  getPlatformNavItemsForState,
  resolveUserJourneyState,
} from "@/lib/journey";

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
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
