import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTaxonomyLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Dimension Tabs Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-36 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Dimension Info Bar Skeleton */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Tree Skeleton */}
      <div className="space-y-1 rounded-lg border p-1">
        {Array.from({ length: 10 }).map((_, i) => {
          const depth = i === 0 ? 0 : i < 3 ? 1 : i < 6 ? 2 : i < 8 ? 3 : 1;
          return (
            <div
              key={i}
              className="mx-1 my-0.5 flex items-center gap-2 rounded-lg border border-l-4 border-l-teal-400/30 px-3 py-2"
              style={{ marginLeft: `${depth * 24}px` }}
            >
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className={`h-4 ${i % 3 === 0 ? "w-40" : i % 3 === 1 ? "w-32" : "w-24"}`} />
              <div className="ml-auto flex items-center gap-1.5">
                <Skeleton className="h-5 w-8 rounded-full" />
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
