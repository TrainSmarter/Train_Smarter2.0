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

  return (
    <div ref={setNodeRef} style={style}>
      {/* Node Row */}
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/50",
          isSelected && "bg-primary/5 border-l-2 border-l-primary",
          isDragging && "opacity-50"
        )}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
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

        {/* Badges */}
        <div className="flex items-center gap-1.5">
          {hasChildren && (
            <Badge variant="gray" size="sm" className="text-xs">
              {node.children.length}
            </Badge>
          )}
          {node.scope === "trainer" && (
            <Badge variant="secondary" size="sm" className="text-xs">
              {scopeBadge}
            </Badge>
          )}
          <TooltipProvider delayDuration={300}>
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
          </TooltipProvider>
        </div>

        {/* Hover Actions */}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <TooltipProvider delayDuration={300}>
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
          </TooltipProvider>
        </div>
      </div>

      {/* Children (recursive, wrapped in SortableContext for DnD) */}
      {hasChildren && isExpanded && (
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
      )}
    </div>
  );
}
