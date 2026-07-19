import { PlatformSkeleton } from "@/components/platform/skeleton";

export default function AdminUsuariosLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <p className="sr-only">Carregando usuários…</p>
      <PlatformSkeleton />
    </div>
  );
}
