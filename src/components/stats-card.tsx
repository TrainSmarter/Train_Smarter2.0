import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
} from "@/components/ui/card"

/**
 * StatsCard — a metric display card with colored left border and trend indicator.
 *
 * Props:
 * - color: blue | green | purple | orange | red
 * - trend: { value: number, direction: 'up' | 'down' | 'neutral' }
 * - icon: React element for the card icon
 * - title: metric label
 * - value: metric value (string for flexible formatting)
 */

const colorStyles: Record<
  string,
  { border: string; iconBg: string; iconText: string }
> = {
  blue: {
    border: "border-l-info",
    iconBg: "bg-info-light dark:bg-info/20",
    iconText: "text-info",
  },
  green: {
    border: "border-l-success",
    iconBg: "bg-success-light dark:bg-success/20",
    iconText: "text-success",
  },
  purple: {
    border: "border-l-violet-500",
    iconBg: "bg-violet-50 dark:bg-violet-500/20",
    iconText: "text-violet-600 dark:text-violet-400",
  },
  orange: {
    border: "border-l-primary",
    iconBg: "bg-primary-50 dark:bg-primary/20",
    iconText: "text-primary-600 dark:text-primary-400",
  },
  red: {
    border: "border-l-error",
    iconBg: "bg-error-light dark:bg-error/20",
    iconText: "text-error",
  },
}

export interface StatsCardTrend {
  value: number
  direction: "up" | "down" | "neutral"
}

export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Color variant — determines the left border and icon background color */
  color?: "blue" | "green" | "purple" | "orange" | "red"
  /** Trend indicator */
  trend?: StatsCardTrend
  /** Icon element displayed in the card */
  icon?: React.ReactNode
  /** Metric label */
  title: string
  /** Metric value (string for flexible formatting like "87%" or "1,234") */
  value: string
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  (
    { className, color = "blue", trend, icon, title, value, ...props },
    ref
  ) => {
    const styles = colorStyles[color]
    const TrendIcon =
      trend?.direction === "up"
        ? TrendingUp
        : trend?.direction === "down"
          ? TrendingDown
          : Minus

    return (
      <Card
        ref={ref}
        className={cn(
          "border-l-4 transition-all duration-200",
          styles.border,
          className
        )}
        {...props}
      >
        <CardContent className="flex items-start justify-between p-4">
          <div className="space-y-1">
            <p className="text-body-sm text-muted-foreground">{title}</p>
            <p className="text-h2 text-foreground">{value}</p>
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-body-sm font-medium",
                  trend.direction === "up" && "text-success-dark dark:text-success",
                  trend.direction === "down" && "text-error-dark dark:text-error",
                  trend.direction === "neutral" && "text-muted-foreground"
                )}
              >
                <TrendIcon className="h-4 w-4" aria-hidden="true" />
                <span>
                  {trend.direction === "up" && "+"}
                  {trend.value}%
                </span>
              </div>
            )}
          </div>

          {icon && (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                styles.iconBg,
                styles.iconText
              )}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
StatsCard.displayName = "StatsCard"

export { StatsCard }
