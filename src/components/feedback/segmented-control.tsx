"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import type { ScaleStepLabels } from "@/lib/feedback/types";

export interface SegmentedControlProps {
  /** Minimum scale value (inclusive) */
  min: number;
  /** Maximum scale value (inclusive) */
  max: number;
  /** Currently selected value (null = nothing selected) */
  value: number | null;
  /** Called when a segment is selected */
  onChange: (value: number) => void;
  /** Labels for each step (localized) */
  labels?: ScaleStepLabels | null;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Accessible name for the group */
  ariaLabel?: string;
  /** Optional error state */
  hasError?: boolean;
}

export function SegmentedControl({
  min,
  max,
  value,
  onChange,
  labels,
  disabled = false,
  ariaLabel,
  hasError = false,
}: SegmentedControlProps) {
  const locale = useLocale();
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const getLabel = (step: number): string | null => {
    if (!labels) return null;
    const label = labels[String(step)];
    if (!label) return null;
    return locale === "en" ? label.en : label.de;
  };

  // Show labels under first and last step only (for compact display)
  const firstLabel = getLabel(min);
  const lastLabel = getLabel(max);

  return (
    <div className="space-y-1">
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex gap-1 rounded-lg border p-1 transition-colors",
          hasError ? "border-error" : "border-input",
          disabled && "opacity-50"
        )}
      >
        {steps.map((step) => {
          const isSelected = value === step;
          const stepLabel = getLabel(step);

          return (
            <button
              key={step}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={stepLabel ?? String(step)}
              title={stepLabel ?? undefined}
              disabled={disabled}
              onClick={() => onChange(step)}
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                disabled && "pointer-events-none"
              )}
            >
              {step}
            </button>
          );
        })}
      </div>
      {/* Labels under first and last */}
      {(firstLabel || lastLabel) && (
        <div className="flex justify-between px-1">
          <span className="text-[11px] text-muted-foreground">{firstLabel}</span>
          {steps.length > 2 && <span />}
          <span className="text-[11px] text-muted-foreground">{lastLabel}</span>
        </div>
      )}
    </div>
  );
}
