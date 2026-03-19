import { SkeletonStatsCard, SkeletonCard } from "@/components/skeleton-composites"

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatsCard key={i} />
        ))}
      </div>
      {/* Content cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
