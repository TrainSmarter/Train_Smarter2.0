"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";
import { Loader2, ChevronRight, ChevronDown, FolderTree } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { moveNode } from "@/lib/taxonomy/actions";
import { getDescendantIds } from "@/lib/taxonomy/tree-utils";
import { cn } from "@/lib/utils";
import type {
  CategoryNode,
  CategoryNodeWithChildren,
} from "@/lib/taxonomy/types";

// ── Types ─────────────────────────────────────────────────────────

interface MoveNodeDialogProps {
  open: boolean;
  node: CategoryNode;
  tree: CategoryNodeWithChildren[];
  flatNodes: CategoryNode[];
  onClose: () => void;
  onConfirm: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export function MoveNodeDialog({
  open,
  node,
  tree,
  flatNodes,
  onClose,
  onConfirm,
}: MoveNodeDialogProps) {
  const t = useTranslations("taxonomy");
  const locale = useTypedLocale();
  const [selectedParentId, setSelectedParentId] = React.useState<string | null>(
    node.parentId
  );
  const [isMoving, setIsMoving] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set(flatNodes.map((n) => n.id))
  );

  // Get IDs that should be disabled (node itself + descendants)
  const disabledIds = React.useMemo(() => {
    const descendants = getDescendantIds(node.id, flatNodes);
    return new Set([node.id, ...descendants]);
  }, [node.id, flatNodes]);

  function toggleExpand(nodeId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  async function handleMove() {
    if (selectedParentId === node.parentId) {
      onClose();
      return;
    }

    setIsMoving(true);
    try {
      const result = await moveNode({
        nodeId: node.id,
        newParentId: selectedParentId,
      });
      if (result.success) {
        toast.success(t("nodeMoved"));
        onConfirm();
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsMoving(false);
    }
  }

  function renderTreeNode(
    treeNode: CategoryNodeWithChildren,
    depth: number
  ): React.ReactNode {
    const isDisabled = disabledIds.has(treeNode.id);
    const isSelected = selectedParentId === treeNode.id;
    const hasChildren = treeNode.children.length > 0;
    const isExpanded = expandedIds.has(treeNode.id);
    const displayName =
      treeNode.name[locale] || treeNode.name.de || treeNode.slug;

    return (
      <div key={treeNode.id}>
        <button
          type="button"
          onClick={() => {
            if (!isDisabled) {
              setSelectedParentId(treeNode.id);
            }
          }}
          disabled={isDisabled}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
            isDisabled
              ? "cursor-not-allowed text-muted-foreground/40"
              : "hover:bg-muted",
            isSelected && !isDisabled && "bg-primary/10 text-primary font-medium"
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {hasChildren ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(treeNode.id);
              }}
              className="cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
          ) : (
            <span className="w-3.5" />
          )}
          <span className="truncate">{displayName}</span>
        </button>

        {hasChildren && isExpanded && (
          <div>
            {treeNode.children.map((child) =>
              renderTreeNode(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("moveNodeTitle")}</DialogTitle>
          <DialogDescription>{t("moveNodeDescription")}</DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto rounded-md border p-2">
          {/* Root option */}
          <button
            type="button"
            onClick={() => setSelectedParentId(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
              selectedParentId === null && "bg-primary/10 text-primary font-medium"
            )}
          >
            <FolderTree className="h-3.5 w-3.5" />
            <span>{t("moveNodeRoot")}</span>
          </button>

          {/* Tree */}
          {tree.map((treeNode) => renderTreeNode(treeNode, 1))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("moveNodeConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
