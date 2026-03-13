import { Skeleton } from "@/components/ui/skeleton";

export default function AthleteDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading athlete profile">
      {/* Back link */}
      <Skeleton className="h-4 w-32" />

      {/* Profile header card */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Skeleton className="h-20 w-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Base data card */}
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
