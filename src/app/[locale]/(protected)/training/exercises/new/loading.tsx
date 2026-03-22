import { SkeletonCard, SkeletonText } from "@/components/skeleton-composites"

export default function NewExerciseLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
      <SkeletonCard>
        <SkeletonText lines={5} />
      </SkeletonCard>
    </div>
  )
}
