import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Source-code invariant tests for PROJ-5 athletes/queries.ts
 *
 * Covers:
 * - Finding #4: FETCH_ALL_LIMIT safety bound on fetchAllAthletes
 * - fetchAthletes pagination uses .range()
 * - Proper error handling (returns empty on error)
 */

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../..", relativePath),
    "utf-8"
  );
}

// ══════════════════════════════════════════════════════════════════
// 1. fetchAllAthletes — LIMIT safety bound (Finding #4)
// ══════════════════════════════════════════════════════════════════

describe("fetchAllAthletes — FETCH_ALL_LIMIT (Finding #4)", () => {
  const queries = readSrc("lib/athletes/queries.ts");

  it("defines FETCH_ALL_LIMIT constant", () => {
    expect(queries).toContain("FETCH_ALL_LIMIT");
  });

  it("FETCH_ALL_LIMIT is set to 500", () => {
    expect(queries).toMatch(/FETCH_ALL_LIMIT\s*=\s*500/);
  });

  it("fetchAllAthletes uses .limit(FETCH_ALL_LIMIT)", () => {
    // Extract the fetchAllAthletes function body
    const fnStart = queries.indexOf("async function fetchAllAthletes");
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = queries.slice(fnStart, fnStart + 1500);

    expect(fnBody).toContain(".limit(FETCH_ALL_LIMIT)");
  });

  it("fetchAllAthletes returns empty array when user is not authenticated", () => {
    const fnStart = queries.indexOf("async function fetchAllAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 500);

    expect(fnBody).toContain("if (!user) return []");
  });

  it("fetchAllAthletes returns empty array on Supabase error", () => {
    const fnStart = queries.indexOf("async function fetchAllAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 1500);

    // Should check for error and return empty array
    expect(fnBody).toContain("if (error)");
    expect(fnBody).toContain("return []");
  });

  it("fetchAllAthletes filters by trainer_id = user.id", () => {
    const fnStart = queries.indexOf("async function fetchAllAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 1500);

    expect(fnBody).toContain('.eq("trainer_id", user.id)');
  });

  it("fetchAllAthletes filters for pending and active statuses only", () => {
    const fnStart = queries.indexOf("async function fetchAllAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 1500);

    expect(fnBody).toContain('.in("status", ["pending", "active"])');
  });

  it("fetchAllAthletes orders by created_at descending", () => {
    const fnStart = queries.indexOf("async function fetchAllAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 1500);

    expect(fnBody).toContain('.order("created_at", { ascending: false })');
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. fetchAthletes — Paginated query
// ══════════════════════════════════════════════════════════════════

describe("fetchAthletes — paginated query", () => {
  const queries = readSrc("lib/athletes/queries.ts");

  it("defines ATHLETES_PAGE_SIZE constant", () => {
    expect(queries).toContain("ATHLETES_PAGE_SIZE");
  });

  it("ATHLETES_PAGE_SIZE is set to 50", () => {
    expect(queries).toMatch(/ATHLETES_PAGE_SIZE\s*=\s*50/);
  });

  it("fetchAthletes uses .range() for pagination", () => {
    const fnStart = queries.indexOf("async function fetchAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 1500);

    expect(fnBody).toContain(".range(from, to)");
  });

  it("fetchAthletes requests exact count for totalCount", () => {
    const fnStart = queries.indexOf("async function fetchAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 1500);

    expect(fnBody).toContain('{ count: "exact" }');
  });

  it("fetchAthletes returns totalCount and hasMore in result", () => {
    const fnStart = queries.indexOf("async function fetchAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 2000);

    expect(fnBody).toContain("totalCount");
    expect(fnBody).toContain("hasMore");
  });

  it("fetchAthletes returns empty result when user is not authenticated", () => {
    const fnStart = queries.indexOf("async function fetchAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 500);

    expect(fnBody).toContain("athletes: [], totalCount: 0, hasMore: false");
  });

  it("fetchAthletes returns empty result on Supabase error", () => {
    const fnStart = queries.indexOf("async function fetchAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 1500);

    expect(fnBody).toContain("if (error)");
    expect(fnBody).toContain("athletes: [], totalCount: 0, hasMore: false");
  });

  it("fetchAthletes calculates range from page number correctly", () => {
    const fnStart = queries.indexOf("async function fetchAthletes");
    const fnBody = queries.slice(fnStart, fnStart + 500);

    expect(fnBody).toContain("(page - 1) * ATHLETES_PAGE_SIZE");
    expect(fnBody).toContain("from + ATHLETES_PAGE_SIZE - 1");
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. FetchAthletesResult type export
// ══════════════════════════════════════════════════════════════════

describe("FetchAthletesResult type", () => {
  const queries = readSrc("lib/athletes/queries.ts");

  it("exports FetchAthletesResult interface", () => {
    expect(queries).toContain("export interface FetchAthletesResult");
  });

  it("FetchAthletesResult includes athletes, totalCount, and hasMore", () => {
    const typeStart = queries.indexOf("export interface FetchAthletesResult");
    const typeBody = queries.slice(typeStart, typeStart + 200);

    expect(typeBody).toContain("athletes: AthleteListItem[]");
    expect(typeBody).toContain("totalCount: number");
    expect(typeBody).toContain("hasMore: boolean");
  });
});
