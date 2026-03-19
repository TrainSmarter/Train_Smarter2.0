import { Skeleton } from "@/components/ui/skeleton"

export default function TrainingLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center space-y-4">
        <Skeleton className="mx-auto h-12 w-12 rounded-lg" />
        <Skeleton className="mx-auto h-7 w-32" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
    </div>
  )
}
