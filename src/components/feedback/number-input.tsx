"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}: NumberInputProps) {
  const generatedId = React.useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-error`;
  const hasError = !!error;

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
          inputMode="decimal"
          value={value ?? ""}
          onChange={handleChange}
          onBlur={onBlur}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={cn(
            unit && "pr-14",
            hasError && "border-error focus-visible:ring-error"
          )}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {unit}
          </span>
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
