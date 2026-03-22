"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buildTree, filterTreeForTrainer, getNodePath, generateSlug } from "@/lib/taxonomy/tree-utils";
import { createNode } from "@/lib/taxonomy/actions";
import type { CategoryNode, CategoryNodeWithChildren } from "@/lib/taxonomy/types";

interface HierarchicalMultiSelectProps {
  /** Dimension ID this select belongs to */
  dimensionId: string;
  /** Flat array of all nodes for this dimension */
  nodes: CategoryNode[];
  /** Currently selected node IDs */
  selectedNodeIds: string[];
  /** Callback when selection changes */
  onChange: (nodeIds: string[]) => void;
  /** Whether user is platform admin */
  isAdmin: boolean;
  /** Current locale */
  locale: "de" | "en";
  /** Label for this dimension */
  label: string;
  /** Placeholder text */
  placeholder?: string;
}

export function HierarchicalMultiSelect({
  dimensionId,
  nodes,
  selectedNodeIds,
  onChange,
  isAdmin,
  locale,
  label,
  placeholder,
}: HierarchicalMultiSelectProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newNameDe, setNewNameDe] = React.useState("");
  const [newNameEn, setNewNameEn] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Local copy for optimistic updates
  const [localNodes, setLocalNodes] = React.useState<CategoryNode[]>(nodes);

  React.useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);

  // Build tree and filter for trainer visibility
  const tree = React.useMemo(() => {
    const built = buildTree(localNodes);
    return filterTreeForTrainer(built, isAdmin);
  }, [localNodes, isAdmin]);

  // Get breadcrumb for a node
  const getBreadcrumb = React.useCallback(
    (nodeId: string): string => {
      const path = getNodePath(nodeId, localNodes);
      return path.map((n) => n.name[locale]).join(" > ");
    },
    [localNodes, locale]
  );

  const selectedNodes = localNodes.filter((n) => selectedNodeIds.includes(n.id));

  function toggleNode(id: string) {
    if (selectedNodeIds.includes(id)) {
      onChange(selectedNodeIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedNodeIds, id]);
    }
  }

  async function handleCreate() {
    if (!newNameDe.trim() || !newNameEn.trim()) return;

    setIsCreating(true);
    try {
      const slug = generateSlug(newNameDe);

      const result = await createNode({
        dimensionId,
        slug,
        name: { de: newNameDe.trim(), en: newNameEn.trim() },
        trainerVisible: true,
      });

      if (result.success && result.data) {
        // Optimistically add to local nodes
        const newNode: CategoryNode = {
          id: result.data.id,
          dimensionId,
          parentId: null,
          slug,
          name: { de: newNameDe.trim(), en: newNameEn.trim() },
          description: null,
          path: slug,
          depth: 0,
          icon: null,
          trainerVisible: true,
          aiHint: null,
          metadata: {},
          scope: "trainer",
          createdBy: null,
          sortOrder: localNodes.length,
          isDeleted: false,
          deletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setLocalNodes((prev) => [...prev, newNode]);
        toast.success(t("taxonomyCreated"));
        setNewNameDe("");
        setNewNameEn("");
        setShowCreate(false);
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsCreating(false);
    }
  }

  // Flatten tree into display order with depth info
  const flatDisplayNodes = React.useMemo(() => {
    const result: { node: CategoryNodeWithChildren; depth: number }[] = [];
    function flatten(nodes: CategoryNodeWithChildren[], depth: number) {
      for (const node of nodes) {
        result.push({ node, depth });
        flatten(node.children, depth + 1);
      }
    }
    flatten(tree, 0);
    return result;
  }, [tree]);

  // Group nodes by top-level parent for display
  const groupedByRoot = React.useMemo(() => {
    const groups: { root: CategoryNodeWithChildren; items: { node: CategoryNodeWithChildren; depth: number }[] }[] = [];
    let currentRoot: CategoryNodeWithChildren | null = null;
    let currentItems: { node: CategoryNodeWithChildren; depth: number }[] = [];

    for (const entry of flatDisplayNodes) {
      if (entry.depth === 0) {
        if (currentRoot) {
          groups.push({ root: currentRoot, items: currentItems });
        }
        currentRoot = entry.node;
        currentItems = [entry];
      } else {
        currentItems.push(entry);
      }
    }
    if (currentRoot) {
      groups.push({ root: currentRoot, items: currentItems });
    }
    return groups;
  }, [flatDisplayNodes]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedNodeIds.length > 0
              ? t("selected", { count: selectedNodeIds.length })
              : placeholder ?? t("selectItems")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("searchTaxonomy")} />
          <CommandList>
            <CommandEmpty>{t("noTaxonomyResults")}</CommandEmpty>

            {groupedByRoot.map((group) => (
              <CommandGroup key={group.root.id} heading={group.root.name[locale]}>
                {group.items.map(({ node, depth }) => {
                  const breadcrumb = getBreadcrumb(node.id);
                  const isSelected = selectedNodeIds.includes(node.id);
                  const isTrainerNode = node.scope === "trainer";

                  return (
                    <CommandItem
                      key={node.id}
                      value={`${node.name.de} ${node.name.en} ${breadcrumb}`}
                      onSelect={() => toggleNode(node.id)}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div
                        className="flex-1 min-w-0"
                        style={{ paddingLeft: `${depth * 12}px` }}
                      >
                        {depth > 0 && (
                          <span className="text-xs text-muted-foreground mr-1">
                            {Array.from({ length: depth })
                              .map(() => "")
                              .join("")}
                          </span>
                        )}
                        <span className="truncate">{node.name[locale]}</span>
                        {depth > 1 && (
                          <span className="block text-xs text-muted-foreground truncate">
                            {breadcrumb}
                          </span>
                        )}
                      </div>
                      {isTrainerNode && (
                        <Badge variant="secondary" size="sm">
                          {t("own")}
                        </Badge>
                      )}
                      {!isTrainerNode && (
                        <Badge variant="primary" size="sm">
                          {t("platform")}
                        </Badge>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>

          {/* Inline create for trainer-scoped nodes */}
          <CommandSeparator />
          <div className="p-2">
            {!showCreate ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-4 w-4" />
                {t("createNew")}
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder={`${t("createNewPlaceholder")} (${t("placeholderDe")})`}
                  value={newNameDe}
                  onChange={(e) => setNewNameDe(e.target.value)}
                  className="h-8 text-sm"
                  maxLength={100}
                  autoFocus
                />
                <Input
                  placeholder={`${t("createNewPlaceholder")} (${t("placeholderEn")})`}
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  className="h-8 text-sm"
                  maxLength={100}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 flex-1"
                    onClick={handleCreate}
                    disabled={!newNameDe.trim() || !newNameEn.trim() || isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      t("createNew")
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => {
                      setShowCreate(false);
                      setNewNameDe("");
                      setNewNameEn("");
                    }}
                  >
                    {tCommon("cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Command>

        {/* Selected tags below the dropdown with breadcrumbs */}
        {selectedNodes.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t p-2">
            {selectedNodes.map((node) => {
              const breadcrumb = getBreadcrumb(node.id);
              return (
                <Badge
                  key={node.id}
                  variant={node.scope === "global" ? "primary" : "secondary"}
                  size="sm"
                  className="cursor-pointer max-w-full"
                  onClick={() => toggleNode(node.id)}
                >
                  <span className="truncate">{breadcrumb}</span>
                  <span className="ml-1 shrink-0">&times;</span>
                </Badge>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Build a breadcrumb string from a node path and the flat node list.
 * For use outside the HierarchicalMultiSelect component.
 */
export function getNodeBreadcrumb(
  nodeId: string,
  flatNodes: CategoryNode[],
  locale: "de" | "en"
): string {
  const path = getNodePath(nodeId, flatNodes);
  return path.map((n) => n.name[locale]).join(" > ");
}
