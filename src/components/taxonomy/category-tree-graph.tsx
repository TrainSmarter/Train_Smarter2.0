"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { hierarchy, tree as d3tree } from "d3-hierarchy";
import { Plus, Minus, Maximize2, FolderTree } from "lucide-react";

import { Button } from "@/components/ui/button";
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

interface CategoryTreeGraphProps {
  tree: CategoryNodeWithChildren[];
  onSelect: (node: CategoryNode) => void;
  locale: "de" | "en";
  selectedNodeId: string | null;
}

// Virtual root to combine multiple root nodes into one d3 hierarchy
interface VirtualRoot {
  _virtual: true;
  children: CategoryNodeWithChildren[];
}

type TreeData = CategoryNodeWithChildren | VirtualRoot;

function isVirtualRoot(d: TreeData): d is VirtualRoot {
  return "_virtual" in d;
}

// ── Constants ─────────────────────────────────────────────────────

const NODE_WIDTH = 164;
const NODE_HEIGHT = 48;
const NODE_SPACING_X = 210;
const NODE_SPACING_Y = 88;
const MIN_SCALE = 0.15;
const MAX_SCALE = 2.5;
const ZOOM_FACTOR = 0.12;

// ── Depth border class ────────────────────────────────────────────

function getDepthBorderClass(depth: number): string {
  if (depth === 0) return "border-l-teal-700 dark:border-l-teal-400";
  if (depth === 1) return "border-l-teal-600 dark:border-l-teal-500";
  if (depth === 2) return "border-l-teal-500 dark:border-l-teal-600";
  if (depth === 3) return "border-l-teal-400 dark:border-l-teal-700";
  return "border-l-teal-300 dark:border-l-teal-800";
}

// ── Component ─────────────────────────────────────────────────────

export function CategoryTreeGraph({
  tree,
  onSelect,
  locale,
  selectedNodeId,
}: CategoryTreeGraphProps) {
  const t = useTranslations("taxonomy");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Transform state
  const [transform, setTransform] = React.useState({ x: 0, y: 0, scale: 1 });
  const isPanningRef = React.useRef(false);
  const panStartRef = React.useRef({ x: 0, y: 0 });
  const transformRef = React.useRef(transform);
  React.useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  // Compute d3 hierarchy layout
  const layoutData = React.useMemo(() => {
    if (tree.length === 0) return null;

    // Create a virtual root if there are multiple top-level nodes
    const rootData: TreeData =
      tree.length === 1
        ? tree[0]
        : { _virtual: true, children: tree };

    const root = hierarchy<TreeData>(rootData, (d) => {
      if (isVirtualRoot(d)) return d.children;
      return d.children.length > 0 ? d.children : undefined;
    });

    const treeLayout = d3tree<TreeData>().nodeSize([
      NODE_SPACING_X,
      NODE_SPACING_Y,
    ]);
    treeLayout(root);

    // Collect all positioned nodes (skip virtual root)
    const nodes: {
      x: number;
      y: number;
      data: CategoryNodeWithChildren;
      depth: number;
    }[] = [];
    const edges: {
      sx: number;
      sy: number;
      tx: number;
      ty: number;
    }[] = [];

    root.each((d) => {
      if (isVirtualRoot(d.data)) return;
      const nodeData = d.data as CategoryNodeWithChildren;
      // d3 tree uses x for horizontal spread and y for depth
      // We swap for a top-down layout
      const px = d.x ?? 0;
      const py = d.y ?? 0;
      const actualDepth = isVirtualRoot(rootData) ? d.depth - 1 : d.depth;
      nodes.push({ x: px, y: py, data: nodeData, depth: actualDepth });
    });

    root.links().forEach((link) => {
      // Skip edges originating from the virtual root node
      if (isVirtualRoot(link.source.data)) return;

      const sx = link.source.x ?? 0;
      const sy = link.source.y ?? 0;
      const tx = link.target.x ?? 0;
      const ty = link.target.y ?? 0;
      edges.push({ sx, sy, tx, ty });
    });

    // Compute bounding box
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x - NODE_WIDTH / 2);
      maxX = Math.max(maxX, n.x + NODE_WIDTH / 2);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + NODE_HEIGHT);
    }

    return {
      nodes,
      edges,
      bounds: { minX, maxX, minY, maxY },
    };
  }, [tree]);

  // Auto-fit on mount and when tree changes
  const fitToView = React.useCallback(() => {
    if (!layoutData || !containerRef.current) return;
    const container = containerRef.current;
    const { bounds } = layoutData;

    const contentWidth = bounds.maxX - bounds.minX + 80;
    const contentHeight = bounds.maxY - bounds.minY + 80;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    let scale = Math.min(scaleX, scaleY, 1.2);

    // Clamp scale
    const nodeCount = layoutData.nodes.length;
    if (nodeCount > 40) {
      scale = Math.min(scale, 0.6);
    } else if (nodeCount < 20) {
      scale = Math.min(scale, 1.0);
    }
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

    const centerX =
      containerWidth / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
    const centerY =
      containerHeight / 2 - ((bounds.minY + bounds.maxY) / 2) * scale;

    setTransform({ x: centerX, y: centerY, scale });
  }, [layoutData]);

  React.useEffect(() => {
    fitToView();
  }, [fitToView]);

  // Resize observer
  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      fitToView();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitToView]);

  // Zoom handler (native wheel listener with { passive: false } for Chrome)
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const prev = transformRef.current;
      const direction = e.deltaY > 0 ? -1 : 1;
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, prev.scale * (1 + direction * ZOOM_FACTOR))
      );

      // Zoom toward cursor position
      const ratio = newScale / prev.scale;
      const newX = cursorX - (cursorX - prev.x) * ratio;
      const newY = cursorY - (cursorY - prev.y) * ratio;

      setTransform({ x: newX, y: newY, scale: newScale });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Pan handlers
  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      // Only pan on left mouse button on the SVG background
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      // Don't pan when clicking on a node (foreignObject content)
      if (target.closest("[data-graph-node]")) return;

      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      containerRef.current?.setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      panStartRef.current = { x: e.clientX, y: e.clientY };

      setTransform((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    },
    []
  );

  const handlePointerUp = React.useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // Double click to fit
  const handleDoubleClick = React.useCallback(() => {
    fitToView();
  }, [fitToView]);

  // Zoom controls
  const zoomIn = React.useCallback(() => {
    setTransform((prev) => {
      const container = containerRef.current;
      if (!container) return prev;
      const cx = container.clientWidth / 2;
      const cy = container.clientHeight / 2;
      const newScale = Math.min(MAX_SCALE, prev.scale * (1 + ZOOM_FACTOR));
      const ratio = newScale / prev.scale;
      return {
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
        scale: newScale,
      };
    });
  }, []);

  const zoomOut = React.useCallback(() => {
    setTransform((prev) => {
      const container = containerRef.current;
      if (!container) return prev;
      const cx = container.clientWidth / 2;
      const cy = container.clientHeight / 2;
      const newScale = Math.max(MIN_SCALE, prev.scale * (1 - ZOOM_FACTOR));
      const ratio = newScale / prev.scale;
      return {
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
        scale: newScale,
      };
    });
  }, []);

  // ── Empty state ──────────────────────────────────────────────────

  if (!layoutData || tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <FolderTree className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t("graphEmpty")}</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  const { nodes, edges } = layoutData;

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-320px)] min-h-[400px] w-full overflow-hidden rounded-lg border bg-background"
      role="img"
      aria-label={t("viewGraph")}
    >
      {/* SVG canvas */}
      <svg
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ touchAction: "none" }}
      >
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {/* Edges */}
          {edges.map((edge, i) => {
            const midY = (edge.sy + NODE_HEIGHT + edge.ty) / 2;
            const path = `M ${edge.sx} ${edge.sy + NODE_HEIGHT} C ${edge.sx} ${midY}, ${edge.tx} ${midY}, ${edge.tx} ${edge.ty}`;
            return (
              <path
                key={i}
                d={path}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.35"
                className="text-teal-500 dark:text-teal-400"
              />
            );
          })}

          {/* Nodes as foreignObject */}
          {nodes.map((node) => {
            const displayName =
              node.data.name[locale] || node.data.name.de || node.data.slug;
            const hasChildren = node.data.children.length > 0;
            const isSelected = selectedNodeId === node.data.id;
            const isHidden = !node.data.trainerVisible;
            const depthBorder = getDepthBorderClass(node.depth);

            return (
              <foreignObject
                key={node.data.id}
                x={node.x - NODE_WIDTH / 2}
                y={node.y}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                overflow="visible"
              >
                <button
                  type="button"
                  data-graph-node
                  className={cn(
                    "flex h-full w-full cursor-pointer items-center gap-1.5 rounded-lg border border-l-4 bg-card px-2.5 shadow-sm transition-all duration-150 hover:scale-[1.04] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    depthBorder,
                    isSelected && "ring-2 ring-teal-500 shadow-md",
                    isHidden && "opacity-50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node.data);
                  }}
                  aria-label={`${displayName} — ${t("graphClickToEdit")}`}
                  title={t("graphClickToEdit")}
                >
                  {/* Icon */}
                  {node.data.icon && (
                    <span className="shrink-0 text-xs" aria-hidden="true">
                      {node.data.icon}
                    </span>
                  )}
                  {/* Name */}
                  <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-foreground">
                    {displayName}
                  </span>
                  {/* Child count badge */}
                  {hasChildren && (
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {node.data.children.length}
                    </span>
                  )}
                </button>
              </foreignObject>
            );
          })}
        </g>
      </svg>

      {/* Zoom Controls Overlay */}
      <TooltipProvider delayDuration={300}>
        <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-md backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={zoomIn}
                aria-label={t("graphZoomIn")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("graphZoomIn")}</TooltipContent>
          </Tooltip>

          {/* Zoom level indicator */}
          <span className="min-w-[3ch] text-center text-[10px] tabular-nums text-muted-foreground">
            {Math.round(transform.scale * 100)}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={zoomOut}
                aria-label={t("graphZoomOut")}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("graphZoomOut")}</TooltipContent>
          </Tooltip>

          <div className="mx-0.5 h-4 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={fitToView}
                aria-label={t("graphZoomReset")}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("graphZoomReset")}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Double-click hint (shows briefly) */}
      <p className="pointer-events-none absolute bottom-4 left-4 text-[10px] text-muted-foreground/60">
        {t("graphDoubleClickHint")}
      </p>
    </div>
  );
}
