"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Globe, User, GraduationCap, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toggleCategoryOverride, updateAthleteRequired } from "@/lib/feedback/actions";
import { CategoryFormModal } from "./category-form-modal";
import type { ActiveCategory, CategoryScope, TrainerCategoryDefault } from "@/lib/feedback/types";

interface CategoryManagerProps {
  /** All categories with their active state */
  categories: ActiveCategory[];
  /** Whether the current user is a trainer managing an athlete's categories */
  isTrainerView?: boolean;
  /** Target athlete ID when trainer creates category / manages required toggles */
  targetAthleteId?: string | null;
  /** Trainer defaults — used to show "Individuell" badge when athlete differs */
  trainerDefaults?: TrainerCategoryDefault[];
  /** Additional classes */
  className?: string;
}

const scopeConfig: Record<
  CategoryScope,
  { icon: typeof Globe; labelKey: string; badgeVariant: "gray" | "primary" | "info" }
> = {
  global: { icon: Globe, labelKey: "scopeGlobal", badgeVariant: "gray" },
  trainer: { icon: GraduationCap, labelKey: "scopeTrainer", badgeVariant: "primary" },
  athlete: { icon: User, labelKey: "scopeAthlete", badgeVariant: "info" },
};

export function CategoryManager({
  categories,
  isTrainerView = false,
  targetAthleteId,
  trainerDefaults,
  className,
}: CategoryManagerProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [localStates, setLocalStates] = React.useState<Record<string, boolean>>(() => {
    const states: Record<string, boolean> = {};
    for (const cat of categories) {
      states[cat.id] = cat.isActive;
    }
    return states;
  });
  const [localRequiredStates, setLocalRequiredStates] = React.useState<Record<string, boolean>>(() => {
    const states: Record<string, boolean> = {};
    for (const cat of categories) {
      states[cat.id] = cat.isEffectivelyRequired;
    }
    return states;
  });
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  // Build trainer default map for comparison
  const defaultMap = React.useMemo(() => {
    const map = new Map<string, TrainerCategoryDefault>();
    if (trainerDefaults) {
      for (const def of trainerDefaults) {
        map.set(def.categoryId, def);
      }
    }
    return map;
  }, [trainerDefaults]);

  // Group by scope
  const grouped = React.useMemo(() => {
    const groups: Record<CategoryScope, ActiveCategory[]> = {
      global: [],
      trainer: [],
      athlete: [],
    };
    for (const cat of categories) {
      groups[cat.scope].push(cat);
    }
    return groups;
  }, [categories]);

  async function handleToggle(categoryId: string, active: boolean) {
    setTogglingId(categoryId);
    const prev = localStates[categoryId];
    setLocalStates((s) => ({ ...s, [categoryId]: active }));

    try {
      const result = await toggleCategoryOverride(categoryId, active);
      if (!result.success) {
        setLocalStates((s) => ({ ...s, [categoryId]: prev }));
        toast.error(t("updateError"));
      }
    } catch {
      setLocalStates((s) => ({ ...s, [categoryId]: prev }));
      toast.error(t("updateError"));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleRequiredToggle(categoryId: string, required: boolean) {
    if (!targetAthleteId) return;
    setTogglingId(categoryId);
    const prev = localRequiredStates[categoryId];
    setLocalRequiredStates((s) => ({ ...s, [categoryId]: required }));

    try {
      const result = await updateAthleteRequired(targetAthleteId, categoryId, required);
      if (!result.success) {
        setLocalRequiredStates((s) => ({ ...s, [categoryId]: prev }));
        toast.error(t("athleteRequiredError"));
      } else {
        toast.success(t("athleteRequiredSaved"));
      }
    } catch {
      setLocalRequiredStates((s) => ({ ...s, [categoryId]: prev }));
      toast.error(t("athleteRequiredError"));
    } finally {
      setTogglingId(null);
    }
  }

  /** Check if athlete's setting differs from trainer default */
  function isIndividual(cat: ActiveCategory): boolean {
    if (!trainerDefaults || trainerDefaults.length === 0) return false;
    const def = defaultMap.get(cat.id);
    const currentActive = localStates[cat.id] ?? cat.isActive;
    const currentRequired = localRequiredStates[cat.id] ?? cat.isEffectivelyRequired;
    // Default: active=true, required=false when no trainer default exists
    const defaultActive = def ? def.isActive : true;
    const defaultRequired = def ? def.isRequired : false;
    return currentActive !== defaultActive || currentRequired !== defaultRequired;
  }

  const scopes: CategoryScope[] = ["global", "trainer", "athlete"];

  return (
    <div className={cn("space-y-6", className)}>
      {scopes.map((scope) => {
        const items = grouped[scope];
        if (items.length === 0) return null;
        const config = scopeConfig[scope];
        const ScopeIcon = config.icon;

        return (
          <section key={scope}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <ScopeIcon className="h-4 w-4" />
              {t(config.labelKey)} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((cat) => {
                const name = locale === "en" ? cat.name.en : cat.name.de;
                const isActive = localStates[cat.id] ?? cat.isActive;
                const isToggling = togglingId === cat.id;

                const isRequired = localRequiredStates[cat.id] ?? cat.isEffectivelyRequired;
                const isTextType = cat.type === "text";
                const showIndividual = isTrainerView && trainerDefaults && isIndividual(cat);

                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between",
                      !isActive && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-sm font-medium">{name}</Label>
                          <Badge
                            variant={config.badgeVariant}
                            size="sm"
                          >
                            {cat.type}
                          </Badge>
                          {isRequired && (
                            <Badge variant="outline" size="sm">
                              {t("required")}
                            </Badge>
                          )}
                          {showIndividual && (
                            <Badge variant="warning" size="sm">
                              {t("individualBadge")}
                            </Badge>
                          )}
                        </div>
                        {cat.unit && (
                          <p className="text-xs text-muted-foreground">
                            {cat.unit}
                            {cat.minValue != null &&
                              cat.maxValue != null &&
                              ` (${cat.minValue}–${cat.maxValue})`}
                          </p>
                        )}
                        {cat.type === "scale" &&
                          cat.minValue != null &&
                          cat.maxValue != null && (
                            <p className="text-xs text-muted-foreground">
                              {t("scaleRange", {
                                min: cat.minValue,
                                max: cat.maxValue,
                              })}
                            </p>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Required toggle — only in trainer view when active */}
                      {isTrainerView && targetAthleteId && isActive && (
                        <div className="flex items-center gap-1.5">
                          <Label
                            htmlFor={`req-${cat.id}`}
                            className={cn(
                              "text-xs whitespace-nowrap",
                              isTextType ? "text-muted-foreground/50" : "text-muted-foreground"
                            )}
                          >
                            {t("defaultRequired")}
                          </Label>
                          <Switch
                            id={`req-${cat.id}`}
                            checked={isRequired}
                            onCheckedChange={(checked) =>
                              handleRequiredToggle(cat.id, checked)
                            }
                            disabled={isTextType || isToggling}
                            aria-label={`${t("defaultRequired")}: ${name}`}
                          />
                        </div>
                      )}
                      {/* Active toggle */}
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) =>
                          handleToggle(cat.id, checked)
                        }
                        disabled={isToggling}
                        aria-label={t("toggleCategory", { name })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {categories.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">
          {t("noCategories")}
        </p>
      )}

      {/* Create new category button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setShowCreateModal(true)}
        iconLeft={<Plus className="h-4 w-4" />}
      >
        {t("createCategory")}
      </Button>

      {/* Create category modal */}
      <CategoryFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        isTrainerView={isTrainerView}
        targetAthleteId={targetAthleteId}
      />
    </div>
  );
}
