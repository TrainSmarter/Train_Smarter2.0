"use client"

import * as React from "react"
import { AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

/**
 * FormField — wraps an Input or Textarea with label, helper text, error state, and icons.
 *
 * Features:
 * - Label with required indicator
 * - Left / right icon slots
 * - Error state: red border + error icon + error message
 * - Helper text below the input
 * - Focus: ring-2 ring-ring ring-offset-2 (inherited from shadcn Input)
 */

export interface FormFieldProps
  extends Omit<React.ComponentProps<"input">, "size"> {
  /** Field label */
  label?: string
  /** Helper text shown below the input */
  helperText?: string
  /** Error message — shows error styling when present */
  error?: string
  /** Icon element on the left side of the input */
  iconLeft?: React.ReactNode
  /** Icon element on the right side of the input */
  iconRight?: React.ReactNode
  /** Whether to render as textarea instead of input */
  multiline?: boolean
  /** Number of rows for textarea mode */
  rows?: number
  /** Additional class for the wrapper */
  wrapperClassName?: string
}

const FormField = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  FormFieldProps
>(
  (
    {
      className,
      label,
      helperText,
      error,
      iconLeft,
      iconRight,
      multiline = false,
      rows = 3,
      wrapperClassName,
      id: providedId,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const id = providedId || generatedId
    const errorId = `${id}-error`
    const helperId = `${id}-helper`
    const hasError = !!error

    const describedBy = [
      hasError ? errorId : null,
      helperText && !hasError ? helperId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined

    const inputClasses = cn(
      hasError &&
        "border-error focus-visible:ring-error text-foreground",
      iconLeft && "pl-10",
      iconRight && "pr-10",
      className
    )

    return (
      <div className={cn("space-y-2", wrapperClassName)}>
        {label && (
          <Label htmlFor={id} className="text-label text-foreground">
            {label}
            {required && (
              <span className="ml-1 text-error" aria-hidden="true">
                *
              </span>
            )}
          </Label>
        )}

        <div className="relative">
          {/* Left icon */}
          {iconLeft && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
              {iconLeft}
            </div>
          )}

          {multiline ? (
            <Textarea
              id={id}
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={inputClasses}
              rows={rows}
              required={required}
              disabled={disabled}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
              {...(props as React.ComponentProps<"textarea">)}
            />
          ) : (
            <Input
              id={id}
              ref={ref as React.Ref<HTMLInputElement>}
              className={inputClasses}
              required={required}
              disabled={disabled}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
              {...props}
            />
          )}

          {/* Right icon or error icon */}
          {(iconRight || hasError) && (
            <div
              className={cn(
                "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2",
                hasError ? "text-error" : "text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {hasError ? <AlertCircle className="h-4 w-4" /> : iconRight}
            </div>
          )}
        </div>

        {/* Error message */}
        {hasError && (
          <p id={errorId} className="text-body-sm text-error" role="alert">
            {error}
          </p>
        )}

        {/* Helper text (hidden when error is shown) */}
        {helperText && !hasError && (
          <p id={helperId} className="text-body-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"

export { FormField }
