import { PlatformSkeleton } from "@/components/platform/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <PlatformSkeleton lines={3} />
    </div>
  );
}
