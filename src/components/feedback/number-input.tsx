"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NumberInputProps {
  /** Field ID for label association */
  id?: string;
  /** Field label */
  label?: string;
  /** Unit suffix displayed inside the input (e.g. "kg", "kcal") */
  unit?: string | null;
  /** Current numeric value (null = empty) */
  value: number | null;
  /** Called with the new value (null when cleared) */
  onChange: (value: number | null) => void;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Decimal precision step (e.g. 0.1 for one decimal) */
  step?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Called when the input loses focus */
  onBlur?: () => void;
  /** Additional classes for the wrapper */
  className?: string;
  /** Show +/- stepper buttons */
  showStepper?: boolean;
  /** Step increment for stepper buttons (defaults to step prop) */
  stepperIncrement?: number;
  /** Last known value to use as starting point for stepper */
  lastValue?: number | null;
}

export function NumberInput({
  id: providedId,
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  placeholder,
  required = false,
  disabled = false,
  onBlur,
  error,
  className,
  showStepper = false,
  stepperIncrement,
  lastValue,
}: NumberInputProps) {
  const generatedId = React.useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-error`;
  const hasError = !!error;
  const isInteger = step >= 1;
  const increment = stepperIncrement ?? step;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === "") {
      onChange(null);
      return;
    }
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onChange(num);
    }
  }

  function clamp(val: number): number {
    let clamped = val;
    if (min != null && clamped < min) clamped = min;
    if (max != null && clamped > max) clamped = max;
    // Round to avoid floating point issues
    const decimals = increment < 1 ? Math.ceil(-Math.log10(increment)) : 0;
    return parseFloat(clamped.toFixed(decimals));
  }

  function handleStepperClick(direction: 1 | -1) {
    let baseValue: number;
    if (value != null) {
      baseValue = value;
    } else if (lastValue != null) {
      baseValue = lastValue;
    } else {
      // Start from min or 0
      baseValue = direction === 1 ? (min ?? 0) : (min ?? 0);
      onChange(clamp(baseValue));
      onBlur?.();
      return;
    }
    const newValue = clamp(baseValue + direction * increment);
    onChange(newValue);
    // Trigger save immediately after stepper click
    onBlur?.();
  }

  // Determine placeholder: show lastValue if available and field is empty
  const effectivePlaceholder =
    value == null && lastValue != null
      ? String(lastValue)
      : placeholder;

  // Compute right padding based on what's shown
  const rightPadding = showStepper
    ? unit
      ? "pr-28" // unit + 2 buttons
      : "pr-20" // 2 buttons only
    : unit
      ? "pr-14"
      : undefined;

  return (
    <div className={cn("space-y-2", className)}>
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
          type="number"
          inputMode={isInteger ? "numeric" : "decimal"}
          value={value ?? ""}
          onChange={handleChange}
          onBlur={onBlur}
          min={min}
          max={max}
          step={step}
          placeholder={effectivePlaceholder}
          required={required}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={cn(
            rightPadding,
            hasError && "border-error focus-visible:ring-error"
          )}
        />
        {showStepper ? (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {unit && (
              <span className="pointer-events-none text-sm text-muted-foreground mr-1">
                {unit}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleStepperClick(-1)}
              disabled={disabled || (min != null && value != null && value <= min)}
              aria-label={`${label ?? ""} verringern`}
              tabIndex={-1}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleStepperClick(1)}
              disabled={disabled || (max != null && value != null && value >= max)}
              aria-label={`${label ?? ""} erhöhen`}
              tabIndex={-1}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          unit && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {unit}
            </span>
          )
        )}
      </div>
      {hasError && (
        <p id={errorId} className="text-body-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
