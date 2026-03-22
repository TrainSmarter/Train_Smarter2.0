// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  buildTree,
  filterTreeForTrainer,
  getNodePath,
  flattenTree,
  searchTree,
  generateSlug,
  getDescendantIds,
} from "./tree-utils";
import type { CategoryNode, CategoryNodeWithChildren } from "./types";

/**
 * Unit tests for PROJ-20 tree utility functions.
 */

// ── Test Fixtures ──────────────────────────────────────────────

const now = new Date().toISOString();

function makeNode(overrides: Partial<CategoryNode> & { id: string }): CategoryNode {
  return {
    dimensionId: "d1",
    parentId: null,
    slug: "test",
    name: { de: "Test", en: "Test" },
    description: null,
    path: "test",
    depth: 0,
    icon: null,
    trainerVisible: true,
    aiHint: null,
    metadata: {},
    scope: "global",
    createdBy: null,
    sortOrder: 0,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const mockNodes: CategoryNode[] = [
  makeNode({
    id: "1",
    slug: "main",
    name: { de: "Hauptübungen", en: "Main" },
    path: "main",
    depth: 0,
    sortOrder: 1,
    trainerVisible: true,
  }),
  makeNode({
    id: "2",
    parentId: "1",
    slug: "upper",
    name: { de: "Oberkörper", en: "Upper" },
    path: "main.upper",
    depth: 1,
    sortOrder: 1,
    trainerVisible: true,
  }),
  makeNode({
    id: "3",
    parentId: "2",
    slug: "push",
    name: { de: "Drücken", en: "Push" },
    path: "main.upper.push",
    depth: 2,
    sortOrder: 1,
    trainerVisible: true,
  }),
  makeNode({
    id: "4",
    parentId: "3",
    slug: "vertical",
    name: { de: "Vertikal", en: "Vertical" },
    path: "main.upper.push.vertical",
    depth: 3,
    sortOrder: 1,
    trainerVisible: false,
  }),
  makeNode({
    id: "5",
    slug: "assist",
    name: { de: "Assistenzübungen", en: "Assist" },
    path: "assist",
    depth: 0,
    sortOrder: 2,
    trainerVisible: true,
  }),
];

// ════════════════════════════════════════════════════════════════
// 1. buildTree
// ════════════════════════════════════════════════════════════════

describe("buildTree", () => {
  it("builds correct tree from flat nodes", () => {
    const tree = buildTree(mockNodes);
    expect(tree).toHaveLength(2); // two roots: "main" and "assist"
    expect(tree[0].id).toBe("1"); // main
    expect(tree[0].children).toHaveLength(1); // upper
    expect(tree[0].children[0].id).toBe("2");
    expect(tree[0].children[0].children).toHaveLength(1); // push
    expect(tree[0].children[0].children[0].children).toHaveLength(1); // vertical
  });

  it("sorts children by sortOrder", () => {
    const nodes = [
      makeNode({ id: "a", slug: "z", sortOrder: 3, path: "z" }),
      makeNode({ id: "b", slug: "a", sortOrder: 1, path: "a" }),
      makeNode({ id: "c", slug: "m", sortOrder: 2, path: "m" }),
    ];
    const tree = buildTree(nodes);
    expect(tree[0].id).toBe("b");
    expect(tree[1].id).toBe("c");
    expect(tree[2].id).toBe("a");
  });

  it("handles empty array", () => {
    const tree = buildTree([]);
    expect(tree).toEqual([]);
  });

  it("handles nodes with no children", () => {
    const nodes = [
      makeNode({ id: "a", slug: "leaf", path: "leaf" }),
    ];
    const tree = buildTree(nodes);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toEqual([]);
  });

  it("treats orphaned nodes as roots (parentId references non-existent node)", () => {
    const nodes = [
      makeNode({
        id: "orphan",
        parentId: "non-existent",
        slug: "orphan",
        path: "orphan",
      }),
    ];
    const tree = buildTree(nodes);
    // Orphan should be pushed to roots since parent is not in the map
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("orphan");
  });
});

// ════════════════════════════════════════════════════════════════
// 2. filterTreeForTrainer
// ════════════════════════════════════════════════════════════════

describe("filterTreeForTrainer", () => {
  const tree = buildTree(mockNodes);

  it("admin sees all nodes (isAdmin=true bypasses filter)", () => {
    const result = filterTreeForTrainer(tree, true);
    expect(result).toBe(tree); // same reference, no filtering
  });

  it("trainer sees trainerVisible=true nodes", () => {
    const result = filterTreeForTrainer(tree, false);
    // Root "main" is trainerVisible=true
    expect(result.find((n) => n.id === "1")).toBeDefined();
    // "assist" is trainerVisible=true
    expect(result.find((n) => n.id === "5")).toBeDefined();
  });

  it("trainer sees nodes at depth <= 2 even if trainerVisible=false", () => {
    // Create a node at depth 2 with trainerVisible=false
    const nodesWithInvisibleDepth2 = [
      makeNode({
        id: "r",
        slug: "root",
        path: "root",
        depth: 0,
        sortOrder: 0,
        trainerVisible: true,
      }),
      makeNode({
        id: "c1",
        parentId: "r",
        slug: "child",
        path: "root.child",
        depth: 1,
        sortOrder: 0,
        trainerVisible: false,
      }),
      makeNode({
        id: "c2",
        parentId: "c1",
        slug: "grandchild",
        path: "root.child.grandchild",
        depth: 2,
        sortOrder: 0,
        trainerVisible: false,
      }),
    ];
    const testTree = buildTree(nodesWithInvisibleDepth2);
    const result = filterTreeForTrainer(testTree, false);
    // depth <= 2 should be visible regardless of trainerVisible
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].children).toHaveLength(1);
  });

  it("trainer does NOT see depth 3+ nodes with trainerVisible=false", () => {
    const result = filterTreeForTrainer(tree, false);
    // Node id "4" is depth 3 and trainerVisible=false
    const mainNode = result.find((n) => n.id === "1");
    expect(mainNode).toBeDefined();
    const pushNode = mainNode!.children[0]?.children[0];
    expect(pushNode).toBeDefined();
    // "vertical" (id=4) at depth 3 with trainerVisible=false should be filtered out
    expect(pushNode!.children).toHaveLength(0);
  });

  it("preserves parent chain for visible deep nodes (intermediate nodes stay)", () => {
    // Deep visible node at depth 3 should keep its parent chain
    const nodesWithDeepVisible = [
      makeNode({
        id: "r",
        slug: "root",
        path: "root",
        depth: 0,
        trainerVisible: false,
      }),
      makeNode({
        id: "c1",
        parentId: "r",
        slug: "child",
        path: "root.child",
        depth: 1,
        trainerVisible: false,
      }),
      makeNode({
        id: "c2",
        parentId: "c1",
        slug: "gc",
        path: "root.child.gc",
        depth: 2,
        trainerVisible: false,
      }),
      makeNode({
        id: "c3",
        parentId: "c2",
        slug: "deep",
        path: "root.child.gc.deep",
        depth: 3,
        trainerVisible: true,
      }),
    ];
    const testTree = buildTree(nodesWithDeepVisible);
    const result = filterTreeForTrainer(testTree, false);
    // All ancestors should be preserved because either depth <= 2 or descendant is visible
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r");
    expect(result[0].children[0].children[0].children).toHaveLength(1);
    expect(result[0].children[0].children[0].children[0].id).toBe("c3");
  });

  it("handles empty tree", () => {
    const result = filterTreeForTrainer([], false);
    expect(result).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// 3. getNodePath
// ════════════════════════════════════════════════════════════════

describe("getNodePath", () => {
  it("returns correct ancestor chain [root, child, grandchild]", () => {
    const path = getNodePath("3", mockNodes);
    expect(path).toHaveLength(3);
    expect(path[0].id).toBe("1"); // root
    expect(path[1].id).toBe("2"); // child
    expect(path[2].id).toBe("3"); // grandchild
  });

  it("returns single node for root", () => {
    const path = getNodePath("1", mockNodes);
    expect(path).toHaveLength(1);
    expect(path[0].id).toBe("1");
  });

  it("returns empty for non-existent nodeId", () => {
    const path = getNodePath("non-existent", mockNodes);
    expect(path).toEqual([]);
  });

  it("works with deeply nested nodes", () => {
    const path = getNodePath("4", mockNodes);
    expect(path).toHaveLength(4);
    expect(path.map((n) => n.id)).toEqual(["1", "2", "3", "4"]);
  });
});

// ════════════════════════════════════════════════════════════════
// 4. flattenTree
// ════════════════════════════════════════════════════════════════

describe("flattenTree", () => {
  it("returns depth-first order", () => {
    const tree = buildTree(mockNodes);
    const flat = flattenTree(tree);
    // depth-first: main -> upper -> push -> vertical -> assist
    expect(flat.map((n) => n.id)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("includes all nodes", () => {
    const tree = buildTree(mockNodes);
    const flat = flattenTree(tree);
    expect(flat).toHaveLength(mockNodes.length);
  });

  it("handles empty tree", () => {
    const flat = flattenTree([]);
    expect(flat).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// 5. searchTree
// ════════════════════════════════════════════════════════════════

describe("searchTree", () => {
  const tree = buildTree(mockNodes);

  it("finds nodes by German name (de locale)", () => {
    const result = searchTree(tree, "Drücken", "de");
    // "Drücken" matches node id=3, its parent chain should be preserved
    expect(result).toHaveLength(1); // only main root (assist has no match)
    const flat = flattenTree(result);
    expect(flat.find((n) => n.id === "3")).toBeDefined();
  });

  it("finds nodes by English name (en locale)", () => {
    const result = searchTree(tree, "Push", "en");
    const flat = flattenTree(result);
    expect(flat.find((n) => n.id === "3")).toBeDefined();
  });

  it("case-insensitive search", () => {
    const result = searchTree(tree, "push", "en");
    const flat = flattenTree(result);
    expect(flat.find((n) => n.id === "3")).toBeDefined();
  });

  it("returns empty for no match", () => {
    const result = searchTree(tree, "zzzznonexistent", "de");
    expect(result).toEqual([]);
  });

  it("preserves parent chain when match is deep", () => {
    const result = searchTree(tree, "Vertikal", "de");
    // Should have main as root since vertical is nested under it
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    // Navigate to the match
    const vertical = result[0].children[0]?.children[0]?.children[0];
    expect(vertical).toBeDefined();
    expect(vertical!.id).toBe("4");
  });

  it("empty query returns full tree", () => {
    const result = searchTree(tree, "", "de");
    expect(result).toBe(tree); // same reference
  });

  it("whitespace-only query returns full tree", () => {
    const result = searchTree(tree, "   ", "de");
    expect(result).toBe(tree);
  });
});

// ════════════════════════════════════════════════════════════════
// 6. generateSlug
// ════════════════════════════════════════════════════════════════

describe("generateSlug", () => {
  it('converts "Oberkörper" to "oberkoerper" (umlauts)', () => {
    expect(generateSlug("Oberkörper")).toBe("oberkoerper");
  });

  it('converts spaces to separator (default "-")', () => {
    expect(generateSlug("Upper Body")).toBe("upper-body");
  });

  it('uses "_" separator when specified', () => {
    expect(generateSlug("Upper Body", "_")).toBe("upper_body");
  });

  it('handles "Große Übung" correctly (ß + ü)', () => {
    expect(generateSlug("Große Übung")).toBe("grosse-uebung");
  });

  it("strips special characters", () => {
    expect(generateSlug("Test! @#$ Value")).toBe("test-value");
  });

  it("lowercases everything", () => {
    expect(generateSlug("UPPER CASE")).toBe("upper-case");
  });

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  it("prefixes leading digits with a letter", () => {
    const slug = generateSlug("3x10 Reps");
    // Should not start with a digit
    expect(slug).toMatch(/^[a-z]/);
  });
});

// ════════════════════════════════════════════════════════════════
// 7. getDescendantIds
// ════════════════════════════════════════════════════════════════

describe("getDescendantIds", () => {
  it("returns all descendants for root node", () => {
    const ids = getDescendantIds("1", mockNodes);
    // "main" -> descendants: upper (main.upper), push (main.upper.push), vertical (main.upper.push.vertical)
    expect(ids).toContain("2");
    expect(ids).toContain("3");
    expect(ids).toContain("4");
    expect(ids).toHaveLength(3);
  });

  it("returns empty for leaf node", () => {
    const ids = getDescendantIds("4", mockNodes);
    expect(ids).toEqual([]);
  });

  it("returns empty for non-existent node", () => {
    const ids = getDescendantIds("non-existent", mockNodes);
    expect(ids).toEqual([]);
  });

  it("uses path prefix matching correctly", () => {
    // "assist" (path: "assist") should not match "assist-extra" but neither should match "main"
    const ids = getDescendantIds("5", mockNodes);
    expect(ids).toEqual([]);
  });
});
