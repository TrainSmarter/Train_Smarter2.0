"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  createDimension,
  updateDimension,
  deleteDimension,
} from "@/lib/taxonomy/actions";
import { generateSlug } from "@/lib/taxonomy/tree-utils";
import type { CategoryDimension } from "@/lib/taxonomy/types";

// ── Form Schema ──────────────────────────────────────────────────

const dimensionFormSchema = z.object({
  nameDe: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  descriptionDe: z.string().max(2000),
  descriptionEn: z.string().max(2000),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_-]*$/),
  exerciseType: z.string(),
});

type DimensionFormValues = z.infer<typeof dimensionFormSchema>;

// ── Types ─────────────────────────────────────────────────────────

interface DimensionFormDialogProps {
  open: boolean;
  dimension: CategoryDimension | null;
  onClose: () => void;
  onSave: () => void;
}

const EXERCISE_TYPE_OPTIONS = [
  { value: "all", labelKey: "allExerciseTypes" },
  { value: "strength", labelKey: "strengthOnly" },
  { value: "endurance", labelKey: "enduranceOnly" },
  { value: "speed", labelKey: "speedOnly" },
  { value: "flexibility", labelKey: "flexibilityOnly" },
] as const;

// ── Component ─────────────────────────────────────────────────────

export function DimensionFormDialog({
  open,
  dimension,
  onClose,
  onSave,
}: DimensionFormDialogProps) {
  const t = useTranslations("taxonomy");
  const isEditing = dimension !== null;

  const [isSaving, setIsSaving] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const form = useForm<DimensionFormValues>({
    resolver: zodResolver(dimensionFormSchema),
    defaultValues: {
      nameDe: "",
      nameEn: "",
      descriptionDe: "",
      descriptionEn: "",
      slug: "",
      exerciseType: "all",
    },
  });

  // Reset form when dimension changes
  React.useEffect(() => {
    if (dimension) {
      form.reset({
        nameDe: dimension.name.de ?? "",
        nameEn: dimension.name.en ?? "",
        descriptionDe: dimension.description?.de ?? "",
        descriptionEn: dimension.description?.en ?? "",
        slug: dimension.slug,
        exerciseType: dimension.exerciseType ?? "all",
      });
    } else {
      form.reset({
        nameDe: "",
        nameEn: "",
        descriptionDe: "",
        descriptionEn: "",
        slug: "",
        exerciseType: "all",
      });
    }
  }, [dimension, form]);

  // Auto-generate slug from EN name (create mode only)
  const watchNameEn = form.watch("nameEn");
  React.useEffect(() => {
    if (!isEditing && watchNameEn) {
      form.setValue("slug", generateSlug(watchNameEn, "_"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchNameEn, isEditing]);

  async function onSubmit(values: DimensionFormValues) {
    setIsSaving(true);
    try {
      const exerciseType = !values.exerciseType || values.exerciseType === "all" ? null : values.exerciseType;

      if (isEditing && dimension) {
        const result = await updateDimension({
          id: dimension.id,
          name: { de: values.nameDe, en: values.nameEn },
          description: { de: values.descriptionDe, en: values.descriptionEn },
          slug: values.slug,
          exerciseType,
        });
        if (result.success) {
          toast.success(t("dimensionUpdated"));
          onSave();
        } else {
          toast.error(t("errorGeneric"));
        }
      } else {
        const result = await createDimension({
          name: { de: values.nameDe, en: values.nameEn },
          description: { de: values.descriptionDe, en: values.descriptionEn },
          slug: values.slug,
          exerciseType,
        });
        if (result.success) {
          toast.success(t("dimensionCreated"));
          onSave();
        } else {
          toast.error(t("errorGeneric"));
        }
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!dimension) return;
    setIsDeleting(true);
    try {
      const result = await deleteDimension(dimension.id);
      if (result.success) {
        toast.success(t("dimensionDeleted"));
        setShowDeleteConfirm(false);
        onSave();
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("dimensionEdit") : t("dimensionNew")}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? t("dimensionEditDescription")
                : t("dimensionNewDescription")}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* Name DE */}
            <div className="space-y-1.5">
              <Label htmlFor="dim-name-de">{t("dimensionNameDe")}</Label>
              <Input
                id="dim-name-de"
                {...form.register("nameDe")}
                aria-invalid={!!form.formState.errors.nameDe}
              />
              {form.formState.errors.nameDe && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.nameDe.message}
                </p>
              )}
            </div>

            {/* Name EN */}
            <div className="space-y-1.5">
              <Label htmlFor="dim-name-en">{t("dimensionNameEn")}</Label>
              <Input
                id="dim-name-en"
                {...form.register("nameEn")}
                aria-invalid={!!form.formState.errors.nameEn}
              />
              {form.formState.errors.nameEn && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.nameEn.message}
                </p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label htmlFor="dim-slug">{t("dimensionSlug")}</Label>
              <Input
                id="dim-slug"
                {...form.register("slug")}
                aria-invalid={!!form.formState.errors.slug}
              />
              <p className="text-xs text-muted-foreground">
                {t("slugAutoGenerated")}
              </p>
              {form.formState.errors.slug && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.slug.message}
                </p>
              )}
            </div>

            {/* Description DE */}
            <div className="space-y-1.5">
              <Label htmlFor="dim-desc-de">{t("dimensionDescriptionDe")}</Label>
              <Textarea
                id="dim-desc-de"
                rows={2}
                {...form.register("descriptionDe")}
              />
            </div>

            {/* Description EN */}
            <div className="space-y-1.5">
              <Label htmlFor="dim-desc-en">{t("dimensionDescriptionEn")}</Label>
              <Textarea
                id="dim-desc-en"
                rows={2}
                {...form.register("descriptionEn")}
              />
            </div>

            {/* Exercise Type */}
            <div className="space-y-1.5">
              <Label htmlFor="dim-exercise-type">{t("dimensionExerciseType")}</Label>
              <Select
                value={form.watch("exerciseType") ?? "all"}
                onValueChange={(v) => form.setValue("exerciseType", v)}
              >
                <SelectTrigger id="dim-exercise-type" aria-label={t("dimensionExerciseType")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mr-auto"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t("delete")}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t("save") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteDimension")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>{t("deleting")}</>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t("delete")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
