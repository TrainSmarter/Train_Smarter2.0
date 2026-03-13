"use client";

import * as React from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface PasswordFieldProps
  extends Omit<React.ComponentProps<"input">, "type" | "size"> {
  /** Field label */
  label?: string;
  /** Helper text shown below the input */
  helperText?: string;
  /** Error message - shows error styling when present */
  error?: string;
  /** Additional class for the wrapper */
  wrapperClassName?: string;
  /** Aria label for the toggle button */
  toggleAriaLabel?: string;
}

const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      wrapperClassName,
      toggleAriaLabel = "Toggle password visibility",
      id: providedId,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const hasError = !!error;
    const [showPassword, setShowPassword] = React.useState(false);

    const describedBy = [
      hasError ? errorId : null,
      helperText && !hasError ? helperId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

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
          <Input
            id={id}
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={cn(
              "pr-16",
              hasError && "border-error focus-visible:ring-error text-foreground",
              className
            )}
            required={required}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            {...props}
          />

          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {hasError && (
              <div className="text-error pr-0.5" aria-hidden="true">
                <AlertCircle className="h-4 w-4" />
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={toggleAriaLabel}
              tabIndex={-1}
              disabled={disabled}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {hasError && (
          <p id={errorId} className="text-body-sm text-error" role="alert">
            {error}
          </p>
        )}

        {helperText && !hasError && (
          <p id={helperId} className="text-body-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
PasswordField.displayName = "PasswordField";

export { PasswordField };
