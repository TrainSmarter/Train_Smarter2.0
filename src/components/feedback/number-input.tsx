"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface NumberInputProps {
  /** Field ID for label association */
  id?: string;
  /** Field label (shown in standalone mode) */
  label?: string;
  /** Unit suffix (e.g. "kg", "kcal") */
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
  /** Whether the field is required (shows asterisk in standalone mode) */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Error state */
  hasError?: boolean;
  /** Error message (standalone mode) */
  error?: string;
  /** Called when the input loses focus */
  onBlur?: () => void;
  /** Use inline strip layout (no label/wrapper, just value+stepper) */
  inline?: boolean;
  /** Additional classes */
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
  hasError = false,
  error,
  onBlur,
  inline = false,
  className,
}: NumberInputProps) {
  const generatedId = React.useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-error`;
  const isInteger = step >= 1;
  const increment = step;

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
    const decimals = increment < 1 ? Math.ceil(-Math.log10(increment)) : 0;
    return parseFloat(clamped.toFixed(decimals));
  }

  function handleStep(direction: 1 | -1) {
    const base = value ?? min ?? 0;
    const newValue = clamp(base + direction * increment);
    onChange(newValue);
    onBlur?.();
  }

  const effectiveError = error ?? (hasError ? "Error" : undefined);

  // Inline mode: just value + unit + stepper (no wrapper, label comes from parent)
  if (inline) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors",
        hasError && "ring-1 ring-error/50 bg-error/5",
        className
      )}>
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={disabled || (min != null && value != null && value <= min)}
          className="flex h-7 w-7 items-center justify-center rounded-md
                     text-muted-foreground hover:text-foreground hover:bg-muted/50
                     active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
          tabIndex={-1}
          aria-label={`${label ?? ""} verringern`}
        >
          <Minus className="h-3 w-3" />
        </button>

        <div className="flex items-baseline gap-1">
          <input
            id={id}
            type="number"
            inputMode={isInteger ? "numeric" : "decimal"}
            value={value ?? ""}
            onChange={handleChange}
            onBlur={onBlur}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={hasError || undefined}
            className={cn(
              "w-[6ch] bg-transparent text-right text-lg font-semibold",
              "tabular-nums",
              hasError ? "text-error" : "text-foreground",
              "border-none outline-none focus:outline-none",
              "placeholder:text-muted-foreground/30",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            )}
          />
          {unit && (
            <span className={cn(
              "text-xs",
              hasError ? "text-error/70" : "text-muted-foreground"
            )}>{unit}</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={disabled || (max != null && value != null && value >= max)}
          className="flex h-7 w-7 items-center justify-center rounded-md
                     text-muted-foreground hover:text-foreground hover:bg-muted/50
                     active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
          tabIndex={-1}
          aria-label={`${label ?? ""} erhöhen`}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // Standalone mode: full input with label, border, error message (used in CategoryFormModal)
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="text-label text-foreground">
          {label}
          {required && (
            <span className="ml-1 text-error" aria-hidden="true">*</span>
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
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={!!effectiveError || undefined}
          aria-describedby={effectiveError ? errorId : undefined}
          className={cn(
            unit && "pr-14",
            effectiveError && "border-error focus-visible:ring-error"
          )}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {effectiveError && (
        <p id={errorId} className="text-body-sm text-error" role="alert">
          {effectiveError}
        </p>
      )}
    </div>
  );
}
