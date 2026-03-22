"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useTypedLocale } from "@/hooks/use-typed-locale";
import { Plus, FolderTree } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { CategoryTree } from "./category-tree";
import { NodeDetailSlideOver } from "./node-detail-slide-over";
import { DimensionFormDialog } from "./dimension-form-dialog";
import { MoveNodeDialog } from "./move-node-dialog";

import { buildTree } from "@/lib/taxonomy/tree-utils";
import type {
  CategoryDimension,
  CategoryNode,
  CategoryNodeWithChildren,
} from "@/lib/taxonomy/types";

// ── Types ─────────────────────────────────────────────────────────

interface TaxonomyAdminPageProps {
  dimensions: CategoryDimension[];
  nodes: CategoryNode[];
}

// ── Main Component ────────────────────────────────────────────────

export function TaxonomyAdminPage({
  dimensions,
  nodes,
}: TaxonomyAdminPageProps) {
  const t = useTranslations("taxonomy");
  const locale = useTypedLocale();
  const router = useRouter();

  // State
  const [selectedDimensionId, setSelectedDimensionId] = React.useState<string>(
    dimensions[0]?.id ?? ""
  );
  const [selectedNode, setSelectedNode] = React.useState<CategoryNode | null>(null);
  const [slideOverMode, setSlideOverMode] = React.useState<"edit" | "create">("edit");
  const [createParentId, setCreateParentId] = React.useState<string | null>(null);
  const [dimensionDialogOpen, setDimensionDialogOpen] = React.useState(false);
  const [editingDimension, setEditingDimension] = React.useState<CategoryDimension | null>(null);
  const [moveNode, setMoveNode] = React.useState<CategoryNode | null>(null);

  // Build trees per dimension
  const treesByDimension = React.useMemo(() => {
    const map = new Map<string, CategoryNodeWithChildren[]>();
    for (const dim of dimensions) {
      const dimNodes = nodes.filter((n) => n.dimensionId === dim.id);
      map.set(dim.id, buildTree(dimNodes));
    }
    return map;
  }, [dimensions, nodes]);

  // Node counts per dimension
  const nodeCountByDimension = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const dim of dimensions) {
      map.set(dim.id, nodes.filter((n) => n.dimensionId === dim.id).length);
    }
    return map;
  }, [dimensions, nodes]);

  // Current tree
  const currentTree = treesByDimension.get(selectedDimensionId) ?? [];
  const currentDimension = dimensions.find((d) => d.id === selectedDimensionId);

  // Handlers
  function handleSelectNode(node: CategoryNode) {
    setSelectedNode(node);
    setSlideOverMode("edit");
  }

  function handleAddChild(parentId: string | null) {
    setSelectedNode(null);
    setCreateParentId(parentId);
    setSlideOverMode("create");
  }

  function handleCloseSlideOver() {
    setSelectedNode(null);
    setSlideOverMode("edit");
    setCreateParentId(null);
  }

  function handleSaveSuccess() {
    handleCloseSlideOver();
    router.refresh();
  }

  function handleNewDimension() {
    setEditingDimension(null);
    setDimensionDialogOpen(true);
  }

  function handleEditDimension(dim: CategoryDimension) {
    setEditingDimension(dim);
    setDimensionDialogOpen(true);
  }

  function handleDimensionDialogClose() {
    setDimensionDialogOpen(false);
    setEditingDimension(null);
  }

  function handleDimensionSaveSuccess() {
    handleDimensionDialogClose();
    router.refresh();
  }

  function handleMoveNode(node: CategoryNode) {
    setMoveNode(node);
  }

  function handleMoveSuccess() {
    setMoveNode(null);
    router.refresh();
  }

  function handleDeleteSuccess() {
    setSelectedNode(null);
    router.refresh();
  }

  function handleReorderSuccess() {
    router.refresh();
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{t("pageTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pageSubtitle")}
          </p>
        </div>
        <Button onClick={handleNewDimension}>
          <Plus className="mr-2 h-4 w-4" />
          {t("dimensionNew")}
        </Button>
      </div>

      {/* Empty State */}
      {dimensions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FolderTree className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            {t("treeEmpty")}
          </p>
          <Button onClick={handleNewDimension} variant="outline" className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            {t("dimensionNew")}
          </Button>
        </div>
      ) : (
        /* Dimension Tabs */
        <Tabs
          value={selectedDimensionId}
          onValueChange={setSelectedDimensionId}
        >
          <div className="flex items-center gap-2 overflow-x-auto">
            <TabsList className="flex-wrap">
              {dimensions.map((dim) => (
                <TabsTrigger
                  key={dim.id}
                  value={dim.id}
                  className="gap-2"
                >
                  <span>{dim.name[locale]}</span>
                  <Badge variant="gray" size="sm">
                    {nodeCountByDimension.get(dim.id) ?? 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {dimensions.map((dim) => (
            <TabsContent key={dim.id} value={dim.id}>
              <CategoryTree
                dimension={dim}
                tree={treesByDimension.get(dim.id) ?? []}
                flatNodes={nodes.filter((n) => n.dimensionId === dim.id)}
                onSelect={handleSelectNode}
                onAddChild={handleAddChild}
                onDelete={handleDeleteSuccess}
                onMove={handleMoveNode}
                onEditDimension={() => handleEditDimension(dim)}
                onReorder={handleReorderSuccess}
                selectedNodeId={selectedNode?.id ?? null}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Node Detail Slide-Over */}
      <NodeDetailSlideOver
        open={slideOverMode === "edit" ? selectedNode !== null : slideOverMode === "create"}
        node={slideOverMode === "edit" ? selectedNode : null}
        mode={slideOverMode}
        dimensionId={selectedDimensionId}
        parentId={createParentId}
        onClose={handleCloseSlideOver}
        onSave={handleSaveSuccess}
      />

      {/* Dimension Form Dialog */}
      <DimensionFormDialog
        open={dimensionDialogOpen}
        dimension={editingDimension}
        onClose={handleDimensionDialogClose}
        onSave={handleDimensionSaveSuccess}
      />

      {/* Move Node Dialog */}
      {moveNode && currentDimension && (
        <MoveNodeDialog
          open={moveNode !== null}
          node={moveNode}
          tree={currentTree}
          flatNodes={nodes.filter((n) => n.dimensionId === selectedDimensionId)}
          onClose={() => setMoveNode(null)}
          onConfirm={handleMoveSuccess}
        />
      )}
    </div>
  );
}
