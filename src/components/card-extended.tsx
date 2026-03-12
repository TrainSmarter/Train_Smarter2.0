import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

/**
 * CardExtended — wraps the shadcn Card with hover and interactive variants.
 *
 * - `hover`: subtle lift effect on hover (-translate-y-0.5 + shadow)
 * - `interactive`: left 4px accent border in primary color + hover lift
 */

export interface CardExtendedProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hover" | "interactive"
}

const CardExtended = React.forwardRef<HTMLDivElement, CardExtendedProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all duration-200",
          variant === "hover" &&
            "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          variant === "interactive" &&
            "border-l-4 border-l-primary hover:-translate-y-0.5 hover:shadow-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      />
    )
  }
)
CardExtended.displayName = "CardExtended"

/**
 * CardHeaderExtended — extends CardHeader with icon, action button support.
 */
export interface CardHeaderExtendedProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon rendered before the title */
  icon?: React.ReactNode
  /** Title text */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Action element (e.g. button) rendered at the right end */
  action?: React.ReactNode
}

const CardHeaderExtended = React.forwardRef<
  HTMLDivElement,
  CardHeaderExtendedProps
>(({ className, icon, title, subtitle, action, ...props }, ref) => {
  return (
    <CardHeader
      ref={ref}
      className={cn("flex flex-row items-start justify-between gap-3", className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
            {icon}
          </div>
        )}
        <div className="space-y-1">
          <CardTitle className="text-h5">{title}</CardTitle>
          {subtitle && (
            <CardDescription>{subtitle}</CardDescription>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </CardHeader>
  )
})
CardHeaderExtended.displayName = "CardHeaderExtended"

export {
  CardExtended,
  CardHeaderExtended,
  // Re-export base parts for convenient usage
  CardContent,
  CardFooter,
}
