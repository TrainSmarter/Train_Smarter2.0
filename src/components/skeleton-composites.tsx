import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton composites — convenience skeleton loaders for common patterns.
 *
 * All composites set `aria-busy="true"` on their container for accessibility.
 */

/* ── SkeletonText ─────────────────────────────────────────────── */

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of text lines to show */
  lines?: number
}

function SkeletonText({
  className,
  lines = 3,
  ...props
}: SkeletonTextProps) {
  return (
    <div
      className={cn("space-y-2", className)}
      aria-busy="true"
      aria-label={props["aria-label"] ?? "Inhalt wird geladen"}
      {...props}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            // Last line is shorter for a natural look
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}
SkeletonText.displayName = "SkeletonText"

/* ── SkeletonCard ─────────────────────────────────────────────── */

export interface SkeletonCardProps
  extends React.HTMLAttributes<HTMLDivElement> {}

function SkeletonCard({ className, ...props }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm space-y-4",
        className
      )}
      aria-busy="true"
      aria-label={props["aria-label"] ?? "Karte wird geladen"}
      {...props}
    >
      {/* Header: icon + title */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {/* Content lines */}
      <SkeletonText lines={2} />
    </div>
  )
}
SkeletonCard.displayName = "SkeletonCard"

/* ── SkeletonStatsCard ────────────────────────────────────────── */

export interface SkeletonStatsCardProps
  extends React.HTMLAttributes<HTMLDivElement> {}

function SkeletonStatsCard({ className, ...props }: SkeletonStatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 border-l-muted bg-card p-4 shadow-sm",
        className
      )}
      aria-busy="true"
      aria-label={props["aria-label"] ?? "Statistik wird geladen"}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  )
}
SkeletonStatsCard.displayName = "SkeletonStatsCard"

/* ── SkeletonAvatar ───────────────────────────────────────────── */

export interface SkeletonAvatarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

function SkeletonAvatar({
  className,
  size = "md",
  ...props
}: SkeletonAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  }

  return (
    <Skeleton
      className={cn("rounded-full", sizeClasses[size], className)}
      aria-busy="true"
      aria-label={props["aria-label"] ?? "Avatar wird geladen"}
      {...props}
    />
  )
}
SkeletonAvatar.displayName = "SkeletonAvatar"

export { SkeletonText, SkeletonCard, SkeletonStatsCard, SkeletonAvatar }
