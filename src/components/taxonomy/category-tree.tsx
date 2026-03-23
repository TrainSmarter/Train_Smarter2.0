"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";
import {
  ChevronsUpDown,
  ChevronsDownUp,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

import { CategoryTreeNode } from "./category-tree-node";

import { reorderNodes, deleteNode } from "@/lib/taxonomy/actions";
import type {
  CategoryDimension,
  CategoryNode,
  CategoryNodeWithChildren,
} from "@/lib/taxonomy/types";

// ── Types ─────────────────────────────────────────────────────────

interface CategoryTreeProps {
  dimension: CategoryDimension;
  tree: CategoryNodeWithChildren[];
  flatNodes: CategoryNode[];
  onSelect: (node: CategoryNode) => void;
  onAddChild: (parentId: string | null) => void;
  onDelete: () => void;
  onMove: (node: CategoryNode) => void;
  onEditDimension: () => void;
  onReorder: () => void;
  selectedNodeId: string | null;
}

// ── Component ─────────────────────────────────────────────────────

export function CategoryTree({
  dimension,
  tree,
  flatNodes,
  onSelect,
  onAddChild,
  onDelete,
  onMove,
  onEditDimension,
  onReorder,
  selectedNodeId,
}: CategoryTreeProps) {
  const t = useTranslations("taxonomy");
  const locale = useTypedLocale();

  // Expanded state
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(
    () => {
      // Default: expand all root nodes
      const initial = new Set<string>();
      for (const node of tree) {
        initial.add(node.id);
      }
      return initial;
    }
  );

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryNode | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handlers
  function toggleNode(nodeId: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  function expandAll() {
    const allIds = new Set<string>();
    for (const node of flatNodes) {
      allIds.add(node.id);
    }
    setExpandedNodes(allIds);
  }

  function collapseAll() {
    setExpandedNodes(new Set());
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteNode(deleteTarget.id);
      if (result.success) {
        toast.success(t("nodeDeleted"));
        onDelete();
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find the siblings at the same level
    const activeNode = flatNodes.find((n) => n.id === active.id);
    const overNode = flatNodes.find((n) => n.id === over.id);
    if (!activeNode || !overNode) return;

    // Only reorder within same parent
    if (activeNode.parentId !== overNode.parentId) return;

    const siblings = flatNodes
      .filter((n) => n.parentId === activeNode.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const oldIndex = siblings.findIndex((n) => n.id === active.id);
    const newIndex = siblings.findIndex((n) => n.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder
    const reordered = [...siblings];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const nodeIds = reordered.map((n) => n.id);

    try {
      const result = await reorderNodes(nodeIds);
      if (result.success) {
        toast.success(t("nodeReordered"));
        onReorder();
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    }
  }

  // Dimension info bar
  const exerciseTypeLabel = dimension.exerciseType
    ? t(
        dimension.exerciseType === "strength"
          ? "strengthOnly"
          : dimension.exerciseType === "endurance"
            ? "enduranceOnly"
            : dimension.exerciseType === "speed"
              ? "speedOnly"
              : "flexibilityOnly"
      )
    : t("allExerciseTypes");

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Dimension Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {dimension.name[locale]}
            </h3>
            {dimension.description?.[locale] && (
              <p className="text-xs text-muted-foreground">
                {dimension.description[locale]}
              </p>
            )}
          </div>
          <Badge variant="secondary" size="sm">
            {exerciseTypeLabel}
          </Badge>
          <Badge variant="gray" size="sm">
            {t("nodeCount", { count: flatNodes.length })}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditDimension}
            aria-label={t("dimensionEdit")}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {t("dimensionEdit")}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("treeExpandAll")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("treeCollapseAll")}</span>
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => onAddChild(null)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("addRootNode")}
        </Button>
      </div>

      {/* Tree Content */}
      {tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <FolderTree className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("treeNoNodes")}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => onAddChild(null)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("addRootNode")}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border p-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tree.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <div role="tree" aria-label={dimension.name[locale]}>
                {tree.map((node) => (
                  <CategoryTreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    isExpanded={expandedNodes.has(node.id)}
                    onToggle={toggleNode}
                    onSelect={onSelect}
                    onAddChild={onAddChild}
                    onDelete={setDeleteTarget}
                    onMove={onMove}
                    isSelected={selectedNodeId === node.id}
                    selectedNodeId={selectedNodeId}
                    expandedNodes={expandedNodes}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteNode")}
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
    </div>
  );
}
