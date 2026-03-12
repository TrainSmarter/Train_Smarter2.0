"use client"

import * as React from "react"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * AlertExtended — semantic alert component with success, warning, error, info variants.
 *
 * Features:
 * - Colored left border + icon
 * - Optional action button
 * - Optional dismiss (onDismiss callback)
 * - ARIA role="alert" for screen readers
 */

const variantConfig = {
  success: {
    border: "border-l-success",
    bg: "bg-success-light/50 dark:bg-success/10",
    icon: CheckCircle2,
    iconColor: "text-success",
  },
  warning: {
    border: "border-l-warning",
    bg: "bg-warning-light/50 dark:bg-warning/10",
    icon: AlertTriangle,
    iconColor: "text-warning",
  },
  error: {
    border: "border-l-error",
    bg: "bg-error-light/50 dark:bg-error/10",
    icon: XCircle,
    iconColor: "text-error",
  },
  info: {
    border: "border-l-info",
    bg: "bg-info-light/50 dark:bg-info/10",
    icon: Info,
    iconColor: "text-info",
  },
} as const

export interface AlertExtendedProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: "success" | "warning" | "error" | "info"
  /** Alert title */
  title?: string
  /** Optional action element (e.g. a button) */
  action?: React.ReactNode
  /** Callback to dismiss the alert — shows a close button when provided */
  onDismiss?: () => void
}

function AlertExtended({
  className,
  variant = "info",
  title,
  action,
  onDismiss,
  children,
  ...props
}: AlertExtendedProps) {
  const config = variantConfig[variant]
  const IconComponent = config.icon

  return (
    <div
      role="alert"
      className={cn(
        "relative flex gap-3 rounded-lg border border-l-4 p-4",
        config.border,
        config.bg,
        className
      )}
      {...props}
    >
      <div className={cn("shrink-0 mt-1", config.iconColor)} aria-hidden="true">
        <IconComponent className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-1">
        {title && (
          <p className="text-button text-foreground">{title}</p>
        )}
        {children && (
          <div className="text-body-sm text-muted-foreground">{children}</div>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Benachrichtigung schließen"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
AlertExtended.displayName = "AlertExtended"

export { AlertExtended }
