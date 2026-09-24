import { PlatformSkeleton } from "@/components/platform/skeleton";

export default function Loading() {
  return (
    <div className="px-1 py-2">
      <PlatformSkeleton variant="default" />
    </div>
  );
}
