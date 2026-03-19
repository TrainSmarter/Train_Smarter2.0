import { SkeletonCard, SkeletonStatsCard } from "@/components/skeleton-composites"
import { Skeleton } from "@/components/ui/skeleton"

export default function AthleteDetailLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatsCard key={i} />
        ))}
      </div>
      {/* Chart + History */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonCard className="min-h-[300px]" />
        <SkeletonCard className="min-h-[300px]" />
      </div>
    </div>
  )
}
