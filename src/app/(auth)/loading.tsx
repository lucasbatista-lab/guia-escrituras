import { PlatformSkeleton } from "@/components/platform/skeleton";

export default function AuthLoading() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <PlatformSkeleton variant="default" lines={2} />
    </div>
  );
}
