"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

import { createNode, updateNode } from "@/lib/taxonomy/actions";
import { generateSlug } from "@/lib/taxonomy/tree-utils";
import type { CategoryNode } from "@/lib/taxonomy/types";

// ── Form Schema ──────────────────────────────────────────────────

const nodeFormSchema = z.object({
  nameDe: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  descriptionDe: z.string().max(2000),
  descriptionEn: z.string().max(2000),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9-]*$/),
  icon: z.string().max(50),
  trainerVisible: z.boolean(),
  aiHint: z.string().max(1000),
});

type NodeFormValues = z.infer<typeof nodeFormSchema>;

// ── Types ─────────────────────────────────────────────────────────

interface NodeDetailSlideOverProps {
  open: boolean;
  node: CategoryNode | null;
  mode: "edit" | "create";
  dimensionId: string;
  parentId: string | null;
  onClose: () => void;
  onSave: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export function NodeDetailSlideOver({
  open,
  node,
  mode,
  dimensionId,
  parentId,
  onClose,
  onSave,
}: NodeDetailSlideOverProps) {
  const t = useTranslations("taxonomy");
  const [isSaving, setIsSaving] = React.useState(false);
  const [userEditedSlug, setUserEditedSlug] = React.useState(false);

  const form = useForm<NodeFormValues>({
    resolver: zodResolver(nodeFormSchema),
    defaultValues: {
      nameDe: "",
      nameEn: "",
      descriptionDe: "",
      descriptionEn: "",
      slug: "",
      icon: "",
      trainerVisible: true,
      aiHint: "",
    },
  });

  // Reset form when node/mode changes
  React.useEffect(() => {
    setUserEditedSlug(false);
    if (mode === "edit" && node) {
      form.reset({
        nameDe: node.name.de ?? "",
        nameEn: node.name.en ?? "",
        descriptionDe: node.description?.de ?? "",
        descriptionEn: node.description?.en ?? "",
        slug: node.slug,
        icon: node.icon ?? "",
        trainerVisible: node.trainerVisible,
        aiHint: node.aiHint ?? "",
      });
    } else if (mode === "create") {
      form.reset({
        nameDe: "",
        nameEn: "",
        descriptionDe: "",
        descriptionEn: "",
        slug: "",
        icon: "",
        trainerVisible: true,
        aiHint: "",
      });
    }
  }, [node, mode, form]);

  // Auto-generate slug from EN name (only when user has not manually edited slug)
  const watchNameEn = form.watch("nameEn");
  React.useEffect(() => {
    if (mode === "create" && watchNameEn && !userEditedSlug) {
      form.setValue("slug", generateSlug(watchNameEn));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchNameEn, mode, userEditedSlug]);

  async function onSubmit(values: NodeFormValues) {
    setIsSaving(true);
    try {
      if (mode === "edit" && node) {
        const result = await updateNode({
          id: node.id,
          name: { de: values.nameDe, en: values.nameEn },
          description: { de: values.descriptionDe, en: values.descriptionEn },
          slug: values.slug,
          icon: values.icon || null,
          trainerVisible: values.trainerVisible,
          aiHint: values.aiHint || null,
        });
        if (result.success) {
          toast.success(t("nodeUpdated"));
          onSave();
        } else {
          toast.error(t("errorGeneric"));
        }
      } else {
        const result = await createNode({
          dimensionId,
          parentId: parentId ?? null,
          name: { de: values.nameDe, en: values.nameEn },
          description: { de: values.descriptionDe, en: values.descriptionEn },
          slug: values.slug,
          icon: values.icon || null,
          trainerVisible: values.trainerVisible,
          aiHint: values.aiHint || null,
        });
        if (result.success) {
          toast.success(t("nodeCreated"));
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

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" ? t("nodeEdit") : t("nodeNew")}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit" && node
              ? node.path
              : t("nodeAddChild")}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >
          {/* Name DE */}
          <div className="space-y-1.5">
            <Label htmlFor="node-name-de">{t("nodeNameDe")}</Label>
            <Input
              id="node-name-de"
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
            <Label htmlFor="node-name-en">{t("nodeNameEn")}</Label>
            <Input
              id="node-name-en"
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
            <Label htmlFor="node-slug">{t("nodeSlug")}</Label>
            <Input
              id="node-slug"
              {...form.register("slug", {
                onChange: () => setUserEditedSlug(true),
              })}
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
            <Label htmlFor="node-desc-de">{t("nodeDescriptionDe")}</Label>
            <Textarea
              id="node-desc-de"
              rows={2}
              {...form.register("descriptionDe")}
            />
          </div>

          {/* Description EN */}
          <div className="space-y-1.5">
            <Label htmlFor="node-desc-en">{t("nodeDescriptionEn")}</Label>
            <Textarea
              id="node-desc-en"
              rows={2}
              {...form.register("descriptionEn")}
            />
          </div>

          {/* Icon */}
          <div className="space-y-1.5">
            <Label htmlFor="node-icon">{t("nodeIcon")}</Label>
            <Input
              id="node-icon"
              {...form.register("icon")}
              placeholder={t("nodeIconPlaceholder")}
            />
          </div>

          {/* Trainer Visible */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="node-trainer-visible" className="text-sm font-medium">
                {t("nodeTrainerVisible")}
              </Label>
            </div>
            <Switch
              id="node-trainer-visible"
              checked={form.watch("trainerVisible")}
              onCheckedChange={(checked) =>
                form.setValue("trainerVisible", checked)
              }
              aria-label={t("nodeTrainerVisible")}
            />
          </div>

          {/* AI Hint */}
          <div className="space-y-1.5">
            <Label htmlFor="node-ai-hint">{t("nodeAiHint")}</Label>
            <Textarea
              id="node-ai-hint"
              rows={3}
              {...form.register("aiHint")}
              placeholder={t("nodeAiHintPlaceholder")}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "edit" ? t("save") : t("create")}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
