"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Globe, GraduationCap, ChevronUp, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertExtended } from "@/components/alert-extended";
import { cn } from "@/lib/utils";
import { updateTrainerDefault, updateCategorySortOrder } from "@/lib/feedback/actions";
import type { FeedbackCategory, TrainerCategoryDefault, CategoryScope } from "@/lib/feedback/types";

interface DefaultSettingsPageProps {
  allCategories: FeedbackCategory[];
  trainerDefaults: TrainerCategoryDefault[];
}

interface LocalDefault {
  isActive: boolean;
  isRequired: boolean;
}

export function DefaultSettingsPage({
  allCategories,
  trainerDefaults,
}: DefaultSettingsPageProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();

  // Build local state from trainerDefaults
  const [localDefaults, setLocalDefaults] = React.useState<Record<string, LocalDefault>>(() => {
    const map: Record<string, LocalDefault> = {};
    // Initialize all categories with default values (active=true, required=false)
    for (const cat of allCategories) {
      map[cat.id] = { isActive: true, isRequired: false };
    }
    // Override with actual trainer defaults
    for (const def of trainerDefaults) {
      map[def.categoryId] = { isActive: def.isActive, isRequired: def.isRequired };
    }
    return map;
  });

  const [savingField, setSavingField] = React.useState<string | null>(null);
  const [sortingId, setSortingId] = React.useState<string | null>(null);
  const [localCategories, setLocalCategories] = React.useState<FeedbackCategory[]>(allCategories);

  // Sync localCategories when allCategories prop changes
  const categoriesKey = React.useMemo(
    () => allCategories.map((c) => `${c.id}:${c.sortOrder}`).join(","),
    [allCategories]
  );

  React.useEffect(() => {
    setLocalCategories(allCategories);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesKey]);

  // Sync local state when trainerDefaults prop changes from server revalidation
  const defaultsKey = React.useMemo(
    () => trainerDefaults.map((d) => `${d.categoryId}:${d.isActive}:${d.isRequired}`).join(","),
    [trainerDefaults]
  );

  React.useEffect(() => {
    const map: Record<string, LocalDefault> = {};
    for (const cat of allCategories) {
      map[cat.id] = { isActive: true, isRequired: false };
    }
    for (const def of trainerDefaults) {
      map[def.categoryId] = { isActive: def.isActive, isRequired: def.isRequired };
    }
    setLocalDefaults(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultsKey]);

  async function handleToggle(
    categoryId: string,
    field: "is_active" | "is_required",
    value: boolean
  ) {
    const key = `${categoryId}-${field}`;
    setSavingField(key);

    // Optimistic update
    const prev = { ...localDefaults[categoryId] };
    setLocalDefaults((s) => {
      const updated = { ...s[categoryId] };
      if (field === "is_active") {
        updated.isActive = value;
        // If deactivating, also set required to false
        if (!value) updated.isRequired = false;
      } else {
        updated.isRequired = value;
      }
      return { ...s, [categoryId]: updated };
    });

    try {
      const result = await updateTrainerDefault(categoryId, field, value);
      if (!result.success) {
        // Revert
        setLocalDefaults((s) => ({ ...s, [categoryId]: prev }));
        toast.error(t("trainerDefaultError"));
      } else {
        toast.success(t("trainerDefaultSaved"));
      }
    } catch {
      // Revert
      setLocalDefaults((s) => ({ ...s, [categoryId]: prev }));
      toast.error(t("trainerDefaultError"));
    } finally {
      setSavingField(null);
    }
  }

  async function handleSwapSort(
    items: FeedbackCategory[],
    index: number,
    direction: "up" | "down"
  ) {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const current = items[index];
    const target = items[targetIndex];
    const currentSort = current.sortOrder;
    const targetSort = target.sortOrder;

    setSortingId(current.id);

    // Optimistic update — swap in local state
    setLocalCategories((prev) => {
      const updated = prev.map((c) => {
        if (c.id === current.id) return { ...c, sortOrder: targetSort };
        if (c.id === target.id) return { ...c, sortOrder: currentSort };
        return c;
      });
      return updated;
    });

    try {
      const [r1, r2] = await Promise.all([
        updateCategorySortOrder(current.id, targetSort),
        updateCategorySortOrder(target.id, currentSort),
      ]);
      if (!r1.success || !r2.success) {
        // Revert
        setLocalCategories((prev) => {
          const reverted = prev.map((c) => {
            if (c.id === current.id) return { ...c, sortOrder: currentSort };
            if (c.id === target.id) return { ...c, sortOrder: targetSort };
            return c;
          });
          return reverted;
        });
        toast.error(t("sortOrderError"));
      } else {
        toast.success(t("sortOrderSaved"));
      }
    } catch {
      // Revert
      setLocalCategories((prev) => {
        const reverted = prev.map((c) => {
          if (c.id === current.id) return { ...c, sortOrder: currentSort };
          if (c.id === target.id) return { ...c, sortOrder: targetSort };
          return c;
        });
        return reverted;
      });
      toast.error(t("sortOrderError"));
    } finally {
      setSortingId(null);
    }
  }

  // Filter non-archived categories and group by scope
  const visibleCategories = localCategories.filter((c) => !c.archivedAt);

  const grouped = React.useMemo(() => {
    const groups: Record<string, FeedbackCategory[]> = {
      global: [],
      trainer: [],
    };
    for (const cat of visibleCategories) {
      if (cat.scope === "global" || cat.scope === "trainer") {
        groups[cat.scope].push(cat);
      }
    }
    // Sort each group by sortOrder
    groups.global.sort((a, b) => a.sortOrder - b.sortOrder);
    groups.trainer.sort((a, b) => a.sortOrder - b.sortOrder);
    return groups;
  }, [visibleCategories]);

  const scopeConfig: Record<
    string,
    { icon: typeof Globe; labelKey: string }
  > = {
    global: { icon: Globe, labelKey: "scopeGlobal" },
    trainer: { icon: GraduationCap, labelKey: "scopeTrainer" },
  };

  const scopes = ["global", "trainer"] as const;

  return (
    <div className="space-y-6 mt-4">
      {/* Header */}
      <div>
        <h2 className="text-h2 text-foreground">{t("settingsTitle")}</h2>
        <p className="mt-1 text-body-lg text-muted-foreground">
          {t("settingsDescription")}
        </p>
      </div>

      {/* Info banner */}
      <AlertExtended variant="info" title={t("settingsTitle")}>
        {t("settingsInfoBanner")}
      </AlertExtended>

      {/* Category list by scope */}
      {scopes.map((scope) => {
        const items = grouped[scope];
        if (!items || items.length === 0) return null;
        const config = scopeConfig[scope];
        const ScopeIcon = config.icon;

        return (
          <section key={scope}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <ScopeIcon className="h-4 w-4" />
              {t(config.labelKey)} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((cat, index) => {
                const name = locale === "en" ? cat.name.en : cat.name.de;
                const defaults = localDefaults[cat.id] ?? { isActive: true, isRequired: false };
                const isTextType = cat.type === "text";
                const isSavingActive = savingField === `${cat.id}-is_active`;
                const isSavingRequired = savingField === `${cat.id}-is_required`;
                const isFirst = index === 0;
                const isLast = index === items.length - 1;
                const isSorting = sortingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
                      !defaults.isActive && "opacity-60"
                    )}
                  >
                    {/* Left: Sort arrows + Category info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Sort arrows */}
                      {items.length > 1 && (
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isFirst || isSorting}
                            onClick={() => handleSwapSort(items, index, "up")}
                            aria-label={t("moveCategoryUp")}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isLast || isSorting}
                            onClick={() => handleSwapSort(items, index, "down")}
                            aria-label={t("moveCategoryDown")}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {cat.icon && (
                        <span className="text-lg" aria-hidden="true">
                          {cat.icon}
                        </span>
                      )}
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{name}</span>
                          <Badge
                            variant={scope === "global" ? "gray" : "primary"}
                            size="sm"
                          >
                            {cat.type}
                          </Badge>
                          {cat.scope !== "global" && (
                            <Badge variant="outline" size="sm">
                              {t(scopeConfig[cat.scope]?.labelKey ?? "scopeTrainer")}
                            </Badge>
                          )}
                        </div>
                        {cat.unit && (
                          <p className="text-xs text-muted-foreground">{cat.unit}</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Toggles */}
                    <div className="flex items-center gap-6 shrink-0">
                      {/* Active toggle */}
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`active-${cat.id}`}
                          className="text-xs text-muted-foreground whitespace-nowrap"
                        >
                          {t("defaultActive")}
                        </Label>
                        <Switch
                          id={`active-${cat.id}`}
                          checked={defaults.isActive}
                          onCheckedChange={(checked) =>
                            handleToggle(cat.id, "is_active", checked)
                          }
                          disabled={isSavingActive}
                          aria-label={`${t("defaultActive")}: ${name}`}
                        />
                      </div>

                      {/* Required toggle — only visible when active, disabled for text */}
                      {defaults.isActive && (
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`required-${cat.id}`}
                            className={cn(
                              "text-xs whitespace-nowrap",
                              isTextType
                                ? "text-muted-foreground/50"
                                : "text-muted-foreground"
                            )}
                          >
                            {t("defaultRequired")}
                          </Label>
                          <Switch
                            id={`required-${cat.id}`}
                            checked={defaults.isRequired}
                            onCheckedChange={(checked) =>
                              handleToggle(cat.id, "is_required", checked)
                            }
                            disabled={isTextType || isSavingRequired}
                            aria-label={`${t("defaultRequired")}: ${name}`}
                          />
                          {isTextType && (
                            <span className="text-[10px] text-muted-foreground/60">
                              {t("textCannotBeRequired")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {visibleCategories.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">
          {t("noCategories")}
        </p>
      )}
    </div>
  );
}
