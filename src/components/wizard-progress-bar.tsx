"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  label: string;
}

interface WizardProgressBarProps {
  steps: WizardStep[];
  currentStep: number;
  className?: string;
  /** Accessible label for the navigation landmark */
  ariaLabel?: string;
}

export function WizardProgressBar({
  steps,
  currentStep,
  className,
  ariaLabel,
}: WizardProgressBarProps) {
  return (
    <nav
      aria-label={ariaLabel || "Wizard progress"}
      className={cn("w-full", className)}
    >
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={index}
              className={cn("flex flex-col items-center gap-2", isLast ? "shrink-0" : "flex-1")}
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className="flex items-center w-full">
                {/* Step circle */}
                <div
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-all duration-300",
                    isCompleted &&
                      "bg-primary text-primary-foreground",
                    isCurrent &&
                      "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isUpcoming &&
                      "border-2 border-border bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Connector line to next step (single unbroken line) */}
                {!isLast && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors duration-300",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Step label (visible on md+) */}
              <span
                className={cn(
                  "hidden text-xs text-center md:block",
                  isCurrent
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
