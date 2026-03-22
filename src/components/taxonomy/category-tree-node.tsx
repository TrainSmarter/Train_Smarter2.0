"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Move,
  Eye,
  EyeOff,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import type {
  CategoryNode,
  CategoryNodeWithChildren,
} from "@/lib/taxonomy/types";

// ── Types ─────────────────────────────────────────────────────────

interface CategoryTreeNodeProps {
  node: CategoryNodeWithChildren;
  depth: number;
  isExpanded: boolean;
  onToggle: (nodeId: string) => void;
  onSelect: (node: CategoryNode) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (node: CategoryNode) => void;
  onMove: (node: CategoryNode) => void;
  isSelected: boolean;
  selectedNodeId: string | null;
  expandedNodes: Set<string>;
}

// ── Component ─────────────────────────────────────────────────────

export function CategoryTreeNode({
  node,
  depth,
  isExpanded,
  onToggle,
  onSelect,
  onAddChild,
  onDelete,
  onMove,
  isSelected,
  selectedNodeId,
  expandedNodes,
}: CategoryTreeNodeProps) {
  const t = useTranslations("taxonomy");
  const locale = useTypedLocale();

  const hasChildren = node.children.length > 0;

  // DnD
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayName = node.name[locale] || node.name.de || node.slug;
  const scopeBadge = node.scope === "global" ? t("global") : t("trainer");

  // Depth-based left border color for card styling (consistent with graph view)
  const depthBorderClass =
    depth === 0
      ? "border-l-teal-700 dark:border-l-teal-400"
      : depth === 1
        ? "border-l-teal-600 dark:border-l-teal-500"
        : depth === 2
          ? "border-l-teal-500 dark:border-l-teal-600"
          : depth === 3
            ? "border-l-teal-400 dark:border-l-teal-700"
            : "border-l-teal-300 dark:border-l-teal-800";

  // Compute Tailwind-compatible indent classes for depth
  // We use a fixed set for depths 0-6, with a CSS variable fallback beyond that
  const indentClass =
    depth === 0 ? "pl-0"
    : depth === 1 ? "pl-6"
    : depth === 2 ? "pl-12"
    : depth === 3 ? "pl-[72px]"
    : depth === 4 ? "pl-24"
    : depth === 5 ? "pl-[120px]"
    : "pl-[144px]";

  return (
    <div ref={setNodeRef} style={style}>
      {/* Node Row -- card-tree style */}
      <div className={cn("relative", indentClass)}>
        {/* Vertical connector line from parent */}
        {depth > 0 && (
          <div
            className="absolute -left-2 top-0 h-full w-px bg-border"
            style={{ left: `${depth * 24 - 8}px` }}
            aria-hidden="true"
          />
        )}
        {/* Horizontal connector line for non-root nodes */}
        {depth > 0 && (
          <div
            className="absolute top-1/2 h-px bg-border"
            style={{ left: `${depth * 24 - 8}px`, width: "8px" }}
            aria-hidden="true"
          />
        )}

        <div
          className={cn(
            "group mx-1 my-0.5 flex items-center gap-2 rounded-lg border border-l-4 bg-card px-3 py-2 shadow-sm transition-all duration-200 hover:bg-muted/50 hover:shadow",
            depthBorderClass,
            isSelected && "bg-primary/5 ring-2 ring-primary/30 shadow",
            isDragging && "opacity-50"
          )}
        >
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground"
            aria-label={t("treeDragHint")}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Expand/Collapse Chevron */}
          {hasChildren ? (
            <button
              onClick={() => onToggle(node.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={isExpanded ? t("treeCollapse") : t("treeExpand")}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {/* Node Icon (if set) */}
          {node.icon && (
            <span className="text-xs text-muted-foreground" title={node.icon}>
              {node.icon}
            </span>
          )}

          {/* Node Name — clickable to open detail */}
          <button
            onClick={() => onSelect(node)}
            className="flex-1 truncate text-left text-sm font-medium text-foreground hover:text-primary"
          >
            {displayName}
          </button>

          {/* Badges + Hover Actions (single TooltipProvider) */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1.5">
              {hasChildren && (
                <Badge variant="gray" size="sm" className="tabular-nums text-xs">
                  {node.children.length}
                </Badge>
              )}
              {node.scope === "trainer" && (
                <Badge variant="secondary" size="sm" className="text-xs">
                  {scopeBadge}
                </Badge>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">
                    {node.trainerVisible ? (
                      <Eye className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {node.trainerVisible ? t("trainerVisible") : t("notTrainerVisible")}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Hover Actions */}
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(node);
                    }}
                    aria-label={t("nodeEdit")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("nodeEdit")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddChild(node.id);
                    }}
                    aria-label={t("nodeAddChild")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("nodeAddChild")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(node);
                    }}
                    aria-label={t("nodeMove")}
                  >
                    <Move className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("nodeMove")}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(node);
                    }}
                    aria-label={t("nodeDelete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("nodeDelete")}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Children (recursive, wrapped in SortableContext for DnD) */}
      {hasChildren && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <SortableContext
            items={node.children.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {node.children.map((child) => (
                <CategoryTreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  isExpanded={expandedNodes.has(child.id)}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onAddChild={onAddChild}
                  onDelete={onDelete}
                  onMove={onMove}
                  isSelected={child.id === selectedNodeId}
                  selectedNodeId={selectedNodeId}
                  expandedNodes={expandedNodes}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      )}
    </div>
  );
}
