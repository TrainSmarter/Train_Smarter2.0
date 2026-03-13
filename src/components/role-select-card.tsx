"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Dumbbell, GraduationCap, Lock } from "lucide-react";

export type RoleValue = "TRAINER" | "ATHLETE";

interface RoleSelectCardProps {
  role: RoleValue;
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  lockedMessage?: string;
  onSelect: (role: RoleValue) => void;
}

const roleIcons: Record<RoleValue, React.ElementType> = {
  TRAINER: GraduationCap,
  ATHLETE: Dumbbell,
};

export function RoleSelectCard({
  role,
  title,
  description,
  selected,
  disabled = false,
  lockedMessage,
  onSelect,
}: RoleSelectCardProps) {
  const Icon = roleIcons[role];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => !disabled && onSelect(role)}
      className={cn(
        "group relative flex w-full flex-col items-center gap-4 rounded-xl border-2 p-6 text-center transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/50 hover:bg-primary/[0.02]",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-200",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}
      >
        <Icon className="h-8 w-8" />
      </div>

      {/* Title */}
      <div className="space-y-1">
        <h3
          className={cn(
            "text-h4",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {title}
        </h3>
        <p className="text-body-sm text-muted-foreground">{description}</p>
      </div>

      {/* Locked indicator */}
      {disabled && lockedMessage && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>{lockedMessage}</span>
        </div>
      )}

      {/* Selection indicator */}
      <div
        className={cn(
          "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200",
          selected
            ? "border-primary bg-primary"
            : "border-border bg-background"
        )}
      >
        {selected && (
          <div className="h-2 w-2 rounded-full bg-primary-foreground" />
        )}
      </div>
    </button>
  );
}
