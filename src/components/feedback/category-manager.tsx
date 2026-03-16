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
import { toggleCategoryOverride } from "@/lib/feedback/actions";
import { CategoryFormModal } from "./category-form-modal";
import type { ActiveCategory, CategoryScope } from "@/lib/feedback/types";

interface CategoryManagerProps {
  /** All categories with their active state */
  categories: ActiveCategory[];
  /** Whether the current user is a trainer managing an athlete's categories */
  isTrainerView?: boolean;
  /** Target athlete ID when trainer creates category */
  targetAthleteId?: string | null;
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
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

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

                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 transition-colors",
                      !isActive && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">{name}</Label>
                          <Badge
                            variant={config.badgeVariant}
                            size="sm"
                          >
                            {cat.type}
                          </Badge>
                          {cat.isRequired && (
                            <Badge variant="outline" size="sm">
                              {t("required")}
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
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) =>
                        handleToggle(cat.id, checked)
                      }
                      disabled={isToggling}
                      aria-label={t("toggleCategory", { name })}
                    />
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
