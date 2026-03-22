import { SkeletonCard } from "@/components/skeleton-composites"

export default function SettingsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
