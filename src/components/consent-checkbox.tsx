"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ConsentCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ConsentCheckbox({
  id,
  checked,
  onCheckedChange,
  required = false,
  disabled = false,
  className,
  children,
}: ConsentCheckboxProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className="mt-0.5"
        aria-required={required || undefined}
      />
      <label
        htmlFor={id}
        className="text-body-sm text-foreground leading-relaxed cursor-pointer select-none"
      >
        {children}
        {required && (
          <span className="ml-1 text-error" aria-hidden="true">
            *
          </span>
        )}
      </label>
    </div>
  );
}
