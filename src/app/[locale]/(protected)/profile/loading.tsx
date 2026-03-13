import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading profile">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-5 w-72" />
      </div>

      {/* Profile card */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Skeleton className="h-20 w-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Trainer / Athletes section */}
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </div>
    </div>
  );
}
