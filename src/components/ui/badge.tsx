import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-success-light text-success-dark dark:bg-success/20 dark:text-success",
        warning:
          "border-transparent bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning",
        error:
          "border-transparent bg-error-light text-error-dark dark:bg-error/20 dark:text-error",
        info: "border-transparent bg-info-light text-info-dark dark:bg-info/20 dark:text-info",
        primary:
          "border-transparent bg-primary-50 text-primary-700 dark:bg-primary/20 dark:text-primary-300",
        gray: "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
      size: {
        sm: "px-2 py-1 text-[11px] leading-[16px]",
        md: "px-2.5 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
