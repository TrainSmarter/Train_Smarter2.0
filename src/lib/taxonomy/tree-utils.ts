/**
 * Client-side tree utility functions -- PROJ-20
 *
 * Pure functions for building, filtering, and searching
 * hierarchical category trees from flat node arrays.
 */

import type {
  CategoryNode,
  CategoryNodeWithChildren,
  BilingualText,
} from "./types";

// ── buildTree ───────────────────────────────────────────────────

/**
 * Convert a flat array of nodes into a nested tree structure.
 * Nodes are sorted by sortOrder within each level.
 */
export function buildTree(
  flatNodes: CategoryNode[]
): CategoryNodeWithChildren[] {
  const nodeMap = new Map<string, CategoryNodeWithChildren>();
  const roots: CategoryNodeWithChildren[] = [];

  // First pass: create all nodes with empty children arrays
  for (const node of flatNodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  // Second pass: build parent-child relationships
  for (const node of flatNodes) {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  // Sort children at each level by sortOrder
  const sortChildren = (nodes: CategoryNodeWithChildren[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };

  sortChildren(roots);

  return roots;
}

// ── filterTreeForTrainer ────────────────────────────────────────

/**
 * Filter tree to show only nodes visible to trainers.
 * Admin sees all nodes. Trainers see nodes where
 * trainerVisible=true OR depth <= 2.
 *
 * A parent node is kept if any of its descendants are visible.
 */
export function filterTreeForTrainer(
  tree: CategoryNodeWithChildren[],
  isAdmin: boolean
): CategoryNodeWithChildren[] {
  if (isAdmin) return tree;

  return filterTreeRecursive(tree);
}

function filterTreeRecursive(
  nodes: CategoryNodeWithChildren[]
): CategoryNodeWithChildren[] {
  const result: CategoryNodeWithChildren[] = [];

  for (const node of nodes) {
    const isVisible = node.trainerVisible || node.depth <= 2;
    const filteredChildren = filterTreeRecursive(node.children);

    // Include node if it's visible OR if it has visible descendants
    if (isVisible || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren,
      });
    }
  }

  return result;
}

// ── getNodePath ─────────────────────────────────────────────────

/**
 * Get the ancestor chain for a node (for breadcrumb display).
 * Returns an array from root to the node itself.
 */
export function getNodePath(
  nodeId: string,
  flatNodes: CategoryNode[]
): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();
  for (const node of flatNodes) {
    nodeMap.set(node.id, node);
  }

  const path: CategoryNode[] = [];
  let current = nodeMap.get(nodeId);

  while (current) {
    path.unshift(current);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }

  return path;
}

// ── flattenTree ─────────────────────────────────────────────────

/**
 * Flatten a nested tree back into a flat array.
 * Traverses depth-first.
 */
export function flattenTree(
  tree: CategoryNodeWithChildren[]
): CategoryNode[] {
  const result: CategoryNode[] = [];

  const traverse = (nodes: CategoryNodeWithChildren[]) => {
    for (const node of nodes) {
      // Extract CategoryNode without children
      const { children: _, ...nodeWithoutChildren } = node;
      result.push(nodeWithoutChildren);
      traverse(node.children);
    }
  };

  traverse(tree);

  return result;
}

// ── searchTree ──────────────────────────────────────────────────

/**
 * Filter a tree by search query, matching against localized names.
 * A node matches if its name contains the query (case-insensitive).
 * Parent nodes are preserved if any descendant matches.
 */
export function searchTree(
  tree: CategoryNodeWithChildren[],
  query: string,
  locale: "de" | "en"
): CategoryNodeWithChildren[] {
  if (!query.trim()) return tree;

  const normalizedQuery = query.toLowerCase().trim();

  return searchTreeRecursive(tree, normalizedQuery, locale);
}

function searchTreeRecursive(
  nodes: CategoryNodeWithChildren[],
  query: string,
  locale: "de" | "en"
): CategoryNodeWithChildren[] {
  const result: CategoryNodeWithChildren[] = [];

  for (const node of nodes) {
    const name = (node.name as BilingualText)[locale] ?? "";
    const nameMatches = name.toLowerCase().includes(query);

    const filteredChildren = searchTreeRecursive(
      node.children,
      query,
      locale
    );

    // Include node if it matches OR if any descendant matches
    if (nameMatches || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren,
      });
    }
  }

  return result;
}

// ── generateSlug ────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from text, handling German umlauts.
 *
 * @param text - Input text to slugify
 * @param separator - Character to use between words. Default '-' for nodes, use '_' for dimensions.
 * @returns Lowercase slug string starting with a letter
 */
export function generateSlug(text: string, separator: "-" | "_" = "-"): string {
  const escaped = separator === "_" ? /[^a-z0-9]+/g : /[^a-z0-9]+/g;
  const edgeTrim = separator === "_"
    ? /^_+|_+$/g
    : /^-+|-+$/g;
  const digitPrefix = separator === "_" ? "d$1" : "n$1";

  return text
    .toLowerCase()
    .trim()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(escaped, separator)
    .replace(edgeTrim, "")
    .replace(/^(\d)/, digitPrefix); // ensure starts with letter
}

// ── getDescendantIds ────────────────────────────────────────────

/**
 * Get all descendant node IDs for a given node (using path prefix matching).
 * Useful for "select parent includes all children" filter logic.
 */
export function getDescendantIds(
  nodeId: string,
  flatNodes: CategoryNode[]
): string[] {
  const node = flatNodes.find((n) => n.id === nodeId);
  if (!node) return [];

  const prefix = node.path + ".";
  return flatNodes
    .filter((n) => n.path.startsWith(prefix))
    .map((n) => n.id);
}
