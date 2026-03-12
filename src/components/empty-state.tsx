import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * EmptyState — a centered empty-state placeholder with icon/emoji, title, description, and optional CTA.
 *
 * Usage contexts: no athletes, no entries, no search results, error fallback.
 */

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon or emoji element displayed above the title */
  icon?: React.ReactNode
  /** Main heading */
  title: string
  /** Descriptive text below the title */
  description?: string
  /** Optional call-to-action element (e.g. a Button) */
  action?: React.ReactNode
}

function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground" aria-hidden="true">
          {typeof icon === "string" ? (
            <span className="text-[48px] leading-none">{icon}</span>
          ) : (
            icon
          )}
        </div>
      )}

      <h3 className="text-h4 text-foreground">{title}</h3>

      {description && (
        <p className="mt-2 max-w-sm text-body text-muted-foreground">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
EmptyState.displayName = "EmptyState"

export { EmptyState }
