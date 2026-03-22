import { SkeletonCard } from "@/components/skeleton-composites"

export default function OnboardingLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
      <SkeletonCard />
    </div>
  )
}
