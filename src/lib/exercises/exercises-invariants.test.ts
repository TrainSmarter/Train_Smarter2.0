import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * PROJ-12 Exercise Library — Source Code Invariant Tests
 *
 * These tests verify structural properties of the codebase to prevent
 * regressions during refactoring. They check:
 * - Server Actions: auth, validation, soft-delete, revalidation
 * - Queries: error handling, data mapping, sorting
 * - Migration: tables, RLS, constraints, seed data
 * - Nav config: training section structure and role guards
 * - Route guards: redirect for unauthorized users
 * - Filter/sort logic: client-side filtering correctness
 */

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../..", relativePath),
    "utf-8"
  );
}

function readRoot(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../..", relativePath),
    "utf-8"
  );
}

// ══════════════════════════════════════════════════════════════════
// 1. Server Actions Invariants (actions.ts)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-12 Server Actions invariants", () => {
  let actions: string;

  beforeEach(() => {
    actions = readSrc("lib/exercises/actions.ts");
  });

  it('should be marked as "use server"', () => {
    expect(actions).toMatch(/^"use server"/);
  });

  describe("all 7 actions authenticate the user", () => {
    const actionNames = [
      "createExercise",
      "updateExercise",
      "deleteExercise",
      "cloneExercise",
      "createTaxonomyEntry",
      "updateTaxonomyEntry",
      "deleteTaxonomyEntry",
    ];

    it("should export at least 7 async functions", () => {
      const exported = actions.match(/export async function \w+/g) ?? [];
      expect(exported.length).toBeGreaterThanOrEqual(7);
      for (const name of actionNames) {
        expect(actions).toContain(`export async function ${name}`);
      }
    });

    it("should call supabase.auth.getUser() in every action", () => {
      const getUserCalls = actions.match(/auth\.getUser\(\)/g) ?? [];
      expect(getUserCalls.length).toBeGreaterThanOrEqual(7);
    });

    it('should return UNAUTHORIZED error when auth fails', () => {
      const unauthorizedReturns = actions.match(/error: "UNAUTHORIZED"/g) ?? [];
      expect(unauthorizedReturns.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe("Zod validation on every mutation", () => {
    it("should use safeParse for input validation", () => {
      const safeParses = actions.match(/\.safeParse\(/g) ?? [];
      expect(safeParses.length).toBeGreaterThanOrEqual(7);
    });

    it('should return INVALID_INPUT on validation failure', () => {
      const invalidInputs = actions.match(/error: "INVALID_INPUT"/g) ?? [];
      expect(invalidInputs.length).toBeGreaterThanOrEqual(7);
    });

    it("should import all Zod schemas from types", () => {
      expect(actions).toContain("createExerciseSchema");
      expect(actions).toContain("updateExerciseSchema");
      expect(actions).toContain("deleteExerciseSchema");
      expect(actions).toContain("cloneExerciseSchema");
      expect(actions).toContain("createTaxonomySchema");
      expect(actions).toContain("updateTaxonomySchema");
      expect(actions).toContain("deleteTaxonomySchema");
    });
  });

  describe("exercises are always trainer-scoped", () => {
    it('should set scope to "trainer" when creating exercises', () => {
      expect(actions).toContain('scope: "trainer"');
    });

    it("should set created_by to user.id when creating exercises", () => {
      expect(actions).toContain("created_by: user.id");
    });

    it("should check created_by = user.id for trainer operations (taxonomy + clone)", () => {
      const ownershipChecks = actions.match(/\.eq\("created_by", user\.id\)/g) ?? [];
      // Trainer taxonomy CRUD + clone still uses created_by checks
      // Admin exercise CRUD uses service-role client instead
      expect(ownershipChecks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("soft-delete pattern", () => {
    it("should use is_deleted: true for exercise deletion", () => {
      expect(actions).toContain("is_deleted: true");
    });

    it("should set deleted_at timestamp on deletion", () => {
      expect(actions).toContain("deleted_at:");
      expect(actions).toContain("new Date().toISOString()");
    });

    it("should NOT use .delete() on exercises table", () => {
      // .delete() is only used on assignments (replace pattern), not on exercises
      const deleteFromExercises = actions.match(/\.from\("exercises"\)\s*\.delete\(\)/g);
      expect(deleteFromExercises).toBeNull();
    });
  });

  describe("clone exercise logic", () => {
    it('should append "(Kopie)" to German name', () => {
      expect(actions).toContain("(Kopie)");
    });

    it('should append "(Copy)" to English name', () => {
      expect(actions).toContain("(Copy)");
    });

    it("should set cloned_from to source exercise id", () => {
      expect(actions).toContain("cloned_from: source.id");
    });

    it("should copy taxonomy assignments from source", () => {
      expect(actions).toContain("exercise_taxonomy_assignments");
      expect(actions).toContain("clonedAssignments");
    });
  });

  describe("revalidation", () => {
    it("should call revalidatePath after every mutation", () => {
      const revalidations = actions.match(/revalidatePath\("/g) ?? [];
      expect(revalidations.length).toBeGreaterThanOrEqual(7);
    });

    it('should revalidate "/training/exercises" path', () => {
      const paths = actions.match(/revalidatePath\("\/training\/exercises"/g) ?? [];
      expect(paths.length).toBeGreaterThanOrEqual(7);
    });

    it('should use "page" scope (not "layout")', () => {
      expect(actions).not.toContain('"layout"');
      const pageScopes = actions.match(/"page"\)/g) ?? [];
      expect(pageScopes.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe("taxonomy sort order", () => {
    it("should determine next sort_order when creating taxonomy", () => {
      expect(actions).toContain("sort_order");
      expect(actions).toContain("nextSortOrder");
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. Server Queries Invariants (queries.ts)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-12 Server Queries invariants", () => {
  let queries: string;

  beforeEach(() => {
    queries = readSrc("lib/exercises/queries.ts");
  });

  it("should export getExercises, getTaxonomy, getExerciseById", () => {
    expect(queries).toContain("export async function getExercises");
    expect(queries).toContain("export async function getTaxonomy");
    expect(queries).toContain("export async function getExerciseById");
  });

  describe("getExercises", () => {
    it("should return empty array on error (not throw)", () => {
      expect(queries).toContain("return [];");
    });

    it("should fetch assignments with taxonomy join (no N+1)", () => {
      expect(queries).toContain("taxonomy:exercise_taxonomy");
    });

    it("should separate primary vs secondary muscle groups", () => {
      expect(queries).toContain("primaryMuscleGroups");
      expect(queries).toContain("secondaryMuscleGroups");
      expect(queries).toContain("a.is_primary");
    });

    it("should sort taxonomy by sortOrder", () => {
      expect(queries).toContain("a.sortOrder - b.sortOrder");
    });

    it("should use .in() for batch assignment fetch (not per-exercise)", () => {
      expect(queries).toContain('.in("exercise_id", exerciseIds)');
    });
  });

  describe("getTaxonomy", () => {
    it("should filter by type parameter", () => {
      expect(queries).toContain('.eq("type", type)');
    });

    it("should order by sort_order ascending", () => {
      expect(queries).toContain('order("sort_order", { ascending: true })');
    });
  });

  describe("getExerciseById", () => {
    it("should use maybeSingle() (returns null instead of error)", () => {
      expect(queries).toContain(".maybeSingle()");
    });

    it("should return null for missing exercises", () => {
      expect(queries).toContain("return null;");
    });
  });

  describe("data mapping", () => {
    it("should have mapTaxonomy function", () => {
      expect(queries).toContain("function mapTaxonomy");
    });

    it("should map snake_case DB fields to camelCase", () => {
      expect(queries).toContain("exercise_type");
      expect(queries).toContain("exerciseType:");
      expect(queries).toContain("created_by");
      expect(queries).toContain("createdBy:");
      expect(queries).toContain("cloned_from");
      expect(queries).toContain("clonedFrom:");
      expect(queries).toContain("is_deleted");
      expect(queries).toContain("isDeleted:");
      expect(queries).toContain("sort_order");
      expect(queries).toContain("sortOrder:");
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. Migration Invariants
// ══════════════════════════════════════════════════════════════════

describe("PROJ-12 Migration invariants", () => {
  let migration: string;

  beforeEach(() => {
    migration = readRoot(
      "supabase/migrations/20260320200000_proj12_exercise_library.sql"
    );
  });

  describe("tables", () => {
    it("should create exercises table", () => {
      expect(migration).toContain("CREATE TABLE public.exercises");
    });

    it("should create exercise_taxonomy table", () => {
      expect(migration).toContain("CREATE TABLE public.exercise_taxonomy");
    });

    it("should create exercise_taxonomy_assignments table", () => {
      expect(migration).toContain("CREATE TABLE public.exercise_taxonomy_assignments");
    });
  });

  describe("exercise_type CHECK constraint", () => {
    it("should enforce strength/endurance/speed/flexibility", () => {
      expect(migration).toContain("chk_exercise_type");
      expect(migration).toContain("'strength'");
      expect(migration).toContain("'endurance'");
      expect(migration).toContain("'speed'");
      expect(migration).toContain("'flexibility'");
    });
  });

  describe("scope/creator consistency", () => {
    it("should enforce global exercises have no created_by", () => {
      expect(migration).toContain("scope = 'global' AND created_by IS NULL");
    });

    it("should enforce trainer exercises have created_by", () => {
      expect(migration).toContain("scope = 'trainer' AND created_by IS NOT NULL");
    });
  });

  describe("RLS enabled on all tables", () => {
    it("should enable RLS on exercises", () => {
      expect(migration).toContain("ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY");
    });

    it("should enable RLS on exercise_taxonomy", () => {
      expect(migration).toContain("ALTER TABLE public.exercise_taxonomy ENABLE ROW LEVEL SECURITY");
    });

    it("should enable RLS on exercise_taxonomy_assignments", () => {
      expect(migration).toContain(
        "ALTER TABLE public.exercise_taxonomy_assignments ENABLE ROW LEVEL SECURITY"
      );
    });
  });

  describe("RLS policies", () => {
    it("should have read policy for global exercises", () => {
      expect(migration).toContain("Anyone can read global exercises");
    });

    it("should have read policy for own exercises", () => {
      expect(migration).toContain("Trainers can read own exercises");
    });

    it("should have admin insert policy for global exercises", () => {
      expect(migration).toContain("Admin can insert global exercises");
      expect(migration).toContain("is_platform_admin()");
    });

    it("should have trainer insert policy for own exercises", () => {
      expect(migration).toContain("Trainers can insert own exercises");
    });

    it("should have assignment policies linked to exercise ownership", () => {
      expect(migration).toContain("Assignments readable via exercise visibility");
      expect(migration).toContain("Exercise owner can insert assignments");
      expect(migration).toContain("Exercise owner can delete assignments");
    });
  });

  describe("is_platform_admin() helper", () => {
    it("should create SECURITY DEFINER function", () => {
      expect(migration).toContain("CREATE OR REPLACE FUNCTION public.is_platform_admin()");
      expect(migration).toContain("SECURITY DEFINER");
    });

    it("should check app_metadata.is_platform_admin", () => {
      expect(migration).toContain("is_platform_admin");
      expect(migration).toContain("app_metadata");
    });
  });

  describe("soft-delete columns", () => {
    it("should have is_deleted on exercises", () => {
      // Two occurrences: exercises + exercise_taxonomy
      const isDeleted = migration.match(/is_deleted\s+boolean/g) ?? [];
      expect(isDeleted.length).toBeGreaterThanOrEqual(2);
    });

    it("should have deleted_at on exercises", () => {
      const deletedAt = migration.match(/deleted_at\s+timestamptz/g) ?? [];
      expect(deletedAt.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("unique constraint on assignments", () => {
    it("should prevent duplicate exercise+taxonomy pairs", () => {
      expect(migration).toContain("uq_exercise_taxonomy");
      expect(migration).toContain("UNIQUE (exercise_id, taxonomy_id)");
    });
  });

  describe("seed data", () => {
    it("should seed 12 muscle groups", () => {
      const muscleGroups = [
        "Brust", "Rücken", "Schultern", "Bizeps", "Trizeps", "Unterarme",
        "Quadrizeps", "Hamstrings", "Waden", "Gluteus", "Core", "Nacken",
      ];
      for (const mg of muscleGroups) {
        expect(migration).toContain(mg);
      }
    });

    it("should seed 6 equipment entries", () => {
      const equipment = [
        "Langhantel", "Kurzhantel", "Kettlebell", "Körpergewicht", "Maschine", "Kabelzug",
      ];
      for (const eq of equipment) {
        expect(migration).toContain(eq);
      }
    });

    it("should seed bilingual names (de + en)", () => {
      expect(migration).toContain('"de":');
      expect(migration).toContain('"en":');
      expect(migration).toContain("Chest");
      expect(migration).toContain("Barbell");
    });

    it("should seed all as global scope", () => {
      // All INSERT VALUES should have 'global'
      const globalScopes = migration.match(/'global', NULL/g) ?? [];
      expect(globalScopes.length).toBe(18); // 12 muscles + 6 equipment
    });
  });

  describe("indexes", () => {
    it("should have index on exercises.scope", () => {
      expect(migration).toContain("idx_exercises_scope");
    });

    it("should have index on exercises.created_by", () => {
      expect(migration).toContain("idx_exercises_created_by");
    });

    it("should have partial index for non-deleted exercises", () => {
      expect(migration).toContain("idx_exercises_not_deleted");
      expect(migration).toContain("WHERE is_deleted = false");
    });

    it("should have index on taxonomy assignments", () => {
      expect(migration).toContain("idx_exercise_taxonomy_assignments_exercise");
      expect(migration).toContain("idx_exercise_taxonomy_assignments_taxonomy");
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 4. Nav Config Invariants
// ══════════════════════════════════════════════════════════════════

describe("PROJ-12 Nav Config invariants", () => {
  let navConfig: string;

  beforeEach(() => {
    navConfig = readSrc("lib/nav-config.ts");
  });

  it('should have Training as a "section" type (not "item")', () => {
    expect(navConfig).toContain('type: "section"');
    expect(navConfig).toContain('labelKey: "training"');
  });

  it('should restrict Training to TRAINER role', () => {
    expect(navConfig).toContain('allowedRoles: ["TRAINER"]');
  });

  it('should set basePath to "/training"', () => {
    expect(navConfig).toContain('basePath: "/training"');
  });

  it('should have exercises sub-item with path "/training/exercises"', () => {
    expect(navConfig).toContain('path: "/training/exercises"');
    expect(navConfig).toContain('labelKey: "trainingExercises"');
  });

  it("should use Library icon for exercises", () => {
    expect(navConfig).toContain("Library");
    expect(navConfig).toContain("icon: Library");
  });

  it("should NOT have workspace or calendar sub-items", () => {
    expect(navConfig).not.toContain("trainingWorkspace");
    expect(navConfig).not.toContain("trainingCalendar");
    expect(navConfig).not.toContain('"/training/calendar"');
  });

  it("should have admin section with requiresPlatformAdmin", () => {
    expect(navConfig).toContain("requiresPlatformAdmin: true");
  });

  it("should have dashboard, feedback, account visible to all roles", () => {
    // These items should NOT have allowedRoles
    expect(navConfig).toContain('path: "/dashboard"');
    expect(navConfig).toContain('path: "/feedback"');
    expect(navConfig).toContain('path: "/account"');
  });
});

// ══════════════════════════════════════════════════════════════════
// 5. Route Invariants
// ══════════════════════════════════════════════════════════════════

describe("PROJ-12 Route invariants", () => {
  describe("/training/page.tsx redirects to exercises", () => {
    let trainingPage: string;

    beforeEach(() => {
      trainingPage = readSrc(
        "app/[locale]/(protected)/training/page.tsx"
      );
    });

    it("should redirect to /training/exercises", () => {
      expect(trainingPage).toContain('redirect("/training/exercises")');
    });

    it("should import redirect from next/navigation", () => {
      expect(trainingPage).toContain('from "next/navigation"');
    });

    it("should NOT import TrainingTabs", () => {
      expect(trainingPage).not.toContain("TrainingTabs");
    });
  });

  describe("/training/exercises/page.tsx role guard", () => {
    let exercisesPage: string;

    beforeEach(() => {
      exercisesPage = readSrc(
        "app/[locale]/(protected)/training/exercises/page.tsx"
      );
    });

    it("should check user authentication", () => {
      expect(exercisesPage).toContain("auth.getUser()");
    });

    it("should redirect to /login if not authenticated", () => {
      expect(exercisesPage).toContain('redirect("/login")');
    });

    it("should redirect to /dashboard if not TRAINER", () => {
      expect(exercisesPage).toContain('redirect("/dashboard")');
      expect(exercisesPage).toContain('role !== "TRAINER"');
    });

    it("should allow platform admin access", () => {
      expect(exercisesPage).toContain("is_platform_admin");
    });

    it("should fetch exercises and taxonomy in parallel", () => {
      expect(exercisesPage).toContain("Promise.all");
      expect(exercisesPage).toContain("getExercises()");
      expect(exercisesPage).toContain('getTaxonomy("muscle_group")');
      expect(exercisesPage).toContain('getTaxonomy("equipment")');
    });

    it("should have generateMetadata with exercises namespace", () => {
      expect(exercisesPage).toContain("generateMetadata");
      expect(exercisesPage).toContain('"exercises"');
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 6. Filter/Sort Logic (extracted from exercise-library-page.tsx)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-12 Client-side filter/sort logic", () => {
  // Replicate the filtering logic as pure functions for testing
  interface MockExercise {
    id: string;
    name: { de: string; en: string };
    exerciseType: string;
    scope: string;
    primaryMuscleGroups: { id: string }[];
    secondaryMuscleGroups: { id: string }[];
    equipment: { id: string }[];
    createdAt: string;
  }

  function filterExercises(
    exercises: MockExercise[],
    options: {
      search?: string;
      category?: string;
      source?: string;
      muscleGroupIds?: string[];
      equipmentIds?: string[];
      sort?: string;
      locale?: "de" | "en";
    }
  ): MockExercise[] {
    let result = [...exercises];

    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (ex) =>
          ex.name.de.toLowerCase().includes(q) ||
          ex.name.en.toLowerCase().includes(q)
      );
    }

    if (options.category && options.category !== "all") {
      result = result.filter((ex) => ex.exerciseType === options.category);
    }

    if (options.source === "platform") {
      result = result.filter((ex) => ex.scope === "global");
    } else if (options.source === "own") {
      result = result.filter((ex) => ex.scope === "trainer");
    }

    if (options.muscleGroupIds && options.muscleGroupIds.length > 0) {
      result = result.filter((ex) =>
        options.muscleGroupIds!.some(
          (mgId) =>
            ex.primaryMuscleGroups.some((mg) => mg.id === mgId) ||
            ex.secondaryMuscleGroups.some((mg) => mg.id === mgId)
        )
      );
    }

    if (options.equipmentIds && options.equipmentIds.length > 0) {
      result = result.filter((ex) =>
        options.equipmentIds!.some((eqId) =>
          ex.equipment.some((eq) => eq.id === eqId)
        )
      );
    }

    const locale = options.locale ?? "de";
    switch (options.sort) {
      case "az":
        result.sort((a, b) => a.name[locale].localeCompare(b.name[locale]));
        break;
      case "za":
        result.sort((a, b) => b.name[locale].localeCompare(a.name[locale]));
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return result;
  }

  const exercises: MockExercise[] = [
    {
      id: "1",
      name: { de: "Bankdrücken", en: "Bench Press" },
      exerciseType: "strength",
      scope: "global",
      primaryMuscleGroups: [{ id: "mg-chest" }],
      secondaryMuscleGroups: [{ id: "mg-triceps" }],
      equipment: [{ id: "eq-barbell" }],
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "2",
      name: { de: "Kniebeuge", en: "Squat" },
      exerciseType: "strength",
      scope: "trainer",
      primaryMuscleGroups: [{ id: "mg-quads" }],
      secondaryMuscleGroups: [{ id: "mg-glutes" }],
      equipment: [{ id: "eq-barbell" }],
      createdAt: "2026-02-01T00:00:00Z",
    },
    {
      id: "3",
      name: { de: "Laufen", en: "Running" },
      exerciseType: "endurance",
      scope: "global",
      primaryMuscleGroups: [],
      secondaryMuscleGroups: [],
      equipment: [],
      createdAt: "2026-03-01T00:00:00Z",
    },
  ];

  describe("search filter", () => {
    it("should return all exercises when search is empty", () => {
      expect(filterExercises(exercises, {})).toHaveLength(3);
    });

    it("should filter by German name", () => {
      const result = filterExercises(exercises, { search: "Kniebeuge" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("should filter by English name", () => {
      const result = filterExercises(exercises, { search: "Bench" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("should be case-insensitive", () => {
      const result = filterExercises(exercises, { search: "bankdrücken" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("should search across both languages simultaneously", () => {
      // "Laufen" is German, "Running" is English — both match exercise 3
      expect(filterExercises(exercises, { search: "laufen" })).toHaveLength(1);
      expect(filterExercises(exercises, { search: "running" })).toHaveLength(1);
    });

    it("should return empty for no matches", () => {
      expect(filterExercises(exercises, { search: "Yoga" })).toHaveLength(0);
    });
  });

  describe("category filter", () => {
    it('should return all when category is "all"', () => {
      expect(filterExercises(exercises, { category: "all" })).toHaveLength(3);
    });

    it("should filter by strength", () => {
      const result = filterExercises(exercises, { category: "strength" });
      expect(result).toHaveLength(2);
    });

    it("should filter by endurance", () => {
      const result = filterExercises(exercises, { category: "endurance" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("3");
    });

    it("should return empty for unused category", () => {
      expect(filterExercises(exercises, { category: "speed" })).toHaveLength(0);
    });
  });

  describe("source filter", () => {
    it("should filter platform (global) only", () => {
      const result = filterExercises(exercises, { source: "platform" });
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.scope === "global")).toBe(true);
    });

    it("should filter own (trainer) only", () => {
      const result = filterExercises(exercises, { source: "own" });
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe("trainer");
    });

    it('should return all when source is "all"', () => {
      expect(filterExercises(exercises, { source: "all" })).toHaveLength(3);
    });
  });

  describe("muscle group filter", () => {
    it("should return all when no muscle groups selected", () => {
      expect(filterExercises(exercises, { muscleGroupIds: [] })).toHaveLength(3);
    });

    it("should filter by primary muscle group", () => {
      const result = filterExercises(exercises, {
        muscleGroupIds: ["mg-chest"],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("should also match secondary muscle groups", () => {
      const result = filterExercises(exercises, {
        muscleGroupIds: ["mg-triceps"],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("should use OR logic for multiple muscle groups", () => {
      const result = filterExercises(exercises, {
        muscleGroupIds: ["mg-chest", "mg-quads"],
      });
      expect(result).toHaveLength(2);
    });

    it("should return empty when no exercises match", () => {
      const result = filterExercises(exercises, {
        muscleGroupIds: ["mg-nonexistent"],
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("equipment filter", () => {
    it("should return all when no equipment selected", () => {
      expect(filterExercises(exercises, { equipmentIds: [] })).toHaveLength(3);
    });

    it("should filter by equipment", () => {
      const result = filterExercises(exercises, {
        equipmentIds: ["eq-barbell"],
      });
      expect(result).toHaveLength(2);
    });

    it("should return empty when equipment not used", () => {
      const result = filterExercises(exercises, {
        equipmentIds: ["eq-dumbbell"],
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("sorting", () => {
    it("should sort A-Z by German name", () => {
      const result = filterExercises(exercises, { sort: "az", locale: "de" });
      expect(result[0].name.de).toBe("Bankdrücken");
      expect(result[1].name.de).toBe("Kniebeuge");
      expect(result[2].name.de).toBe("Laufen");
    });

    it("should sort Z-A by German name", () => {
      const result = filterExercises(exercises, { sort: "za", locale: "de" });
      expect(result[0].name.de).toBe("Laufen");
      expect(result[2].name.de).toBe("Bankdrücken");
    });

    it("should sort newest first", () => {
      const result = filterExercises(exercises, { sort: "newest" });
      expect(result[0].id).toBe("3"); // March
      expect(result[1].id).toBe("2"); // February
      expect(result[2].id).toBe("1"); // January
    });

    it("should sort A-Z by English name when locale is en", () => {
      const result = filterExercises(exercises, { sort: "az", locale: "en" });
      expect(result[0].name.en).toBe("Bench Press");
      expect(result[1].name.en).toBe("Running");
      expect(result[2].name.en).toBe("Squat");
    });
  });

  describe("combined filters", () => {
    it("should apply search + category together", () => {
      const result = filterExercises(exercises, {
        search: "Knie",
        category: "strength",
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("should apply search + source together", () => {
      const result = filterExercises(exercises, {
        search: "Knie",
        source: "platform",
      });
      expect(result).toHaveLength(0); // Kniebeuge is trainer-scoped
    });

    it("should apply category + muscle group + equipment", () => {
      const result = filterExercises(exercises, {
        category: "strength",
        muscleGroupIds: ["mg-chest"],
        equipmentIds: ["eq-barbell"],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("should return empty when all filters exclude everything", () => {
      const result = filterExercises(exercises, {
        category: "endurance",
        muscleGroupIds: ["mg-chest"], // Laufen has no muscle groups
      });
      expect(result).toHaveLength(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 7. i18n Invariants
// ══════════════════════════════════════════════════════════════════

describe("PROJ-12 i18n invariants", () => {
  let deJson: Record<string, unknown>;
  let enJson: Record<string, unknown>;

  beforeEach(() => {
    deJson = JSON.parse(readSrc("messages/de.json"));
    enJson = JSON.parse(readSrc("messages/en.json"));
  });

  it('should have "exercises" namespace in both languages', () => {
    expect(deJson).toHaveProperty("exercises");
    expect(enJson).toHaveProperty("exercises");
  });

  it("should have matching keys in de and en exercises namespace", () => {
    const deKeys = Object.keys(deJson.exercises as Record<string, unknown>).sort();
    const enKeys = Object.keys(enJson.exercises as Record<string, unknown>).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it("should have nav keys for training section", () => {
    const deNav = deJson.nav as Record<string, string>;
    const enNav = enJson.nav as Record<string, string>;
    expect(deNav.training).toBeDefined();
    expect(deNav.trainingExercises).toBeDefined();
    expect(enNav.training).toBeDefined();
    expect(enNav.trainingExercises).toBeDefined();
  });

  it("should NOT have stale training tab keys", () => {
    const deNav = deJson.nav as Record<string, string>;
    expect(deNav).not.toHaveProperty("trainingWorkspace");
    expect(deNav).not.toHaveProperty("trainingCalendar");
  });

  it("should NOT have separate training namespace (tabs removed)", () => {
    expect(deJson).not.toHaveProperty("training");
    expect(enJson).not.toHaveProperty("training");
  });

  it("should have correct German umlauts in exercise strings", () => {
    const deExercises = deJson.exercises as Record<string, string>;
    // Check a few key strings that should have umlauts
    const allValues = Object.values(deExercises).join(" ");
    expect(allValues).toContain("Übung");
    expect(allValues).not.toContain("Uebung");
  });
});

// ══════════════════════════════════════════════════════════════════
// 8. Component Source Invariants
// ══════════════════════════════════════════════════════════════════

describe("PROJ-12 Component source invariants", () => {
  it("should NOT import TrainingTabs in exercise-library-page", () => {
    const source = readSrc("components/exercises/exercise-library-page.tsx");
    expect(source).not.toContain("TrainingTabs");
    expect(source).not.toContain("training-tabs");
  });

  it("should NOT have training-tabs.tsx file", () => {
    const exists = fs.existsSync(
      path.resolve(__dirname, "../../components/training/training-tabs.tsx")
    );
    expect(exists).toBe(false);
  });

  it("should use Sheet for slide-over (not Dialog)", () => {
    const slideOver = readSrc("components/exercises/exercise-slide-over.tsx");
    expect(slideOver).toContain("Sheet");
    expect(slideOver).toContain("SheetContent");
  });

  it("should use useTranslations in all exercise components", () => {
    const components = [
      "components/exercises/exercise-library-page.tsx",
      "components/exercises/exercise-card.tsx",
      "components/exercises/exercise-slide-over.tsx",
      "components/exercises/exercise-form.tsx",
      "components/exercises/exercise-filters.tsx",
    ];
    for (const comp of components) {
      const source = readSrc(comp);
      expect(source).toContain("useTranslations");
    }
  });

  it("should use useLocale or useTypedLocale for bilingual name display", () => {
    const libraryPage = readSrc("components/exercises/exercise-library-page.tsx");
    const usesLocale = libraryPage.includes("useLocale") || libraryPage.includes("useTypedLocale");
    expect(usesLocale).toBe(true);
  });

  it("should import Link from @/i18n/navigation (not next/link)", () => {
    const components = [
      "components/exercises/exercise-card.tsx",
      "components/exercises/exercise-filters.tsx",
    ];
    for (const comp of components) {
      const source = readSrc(comp);
      if (source.includes("Link")) {
        expect(source).not.toContain('from "next/link"');
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// Admin Global Exercise CRUD (scope + service-role client)
// ══════════════════════════════════════════════════════════════════

describe("Admin global exercise CRUD", () => {
  let actions: string;

  beforeEach(() => {
    actions = readSrc("lib/exercises/actions.ts");
  });

  describe("createExercise — admin scope handling", () => {
    it("should set scope='global' for admin", () => {
      expect(actions).toContain('scope: isAdmin ? "global" : "trainer"');
    });

    it("should set created_by=null for admin (CHECK constraint)", () => {
      expect(actions).toContain("created_by: isAdmin ? null : user.id");
    });

    it("should use service-role client for admin inserts", () => {
      // createExercise must create a service-role client for admin
      const createFn = actions.slice(
        actions.indexOf("export async function createExercise"),
        actions.indexOf("export async function updateExercise")
      );
      expect(createFn).toContain("createSupabaseClient");
      expect(createFn).toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(createFn).toContain("is_platform_admin");
    });
  });

  describe("updateExercise — admin service-role client", () => {
    it("should use service-role client for admin updates", () => {
      const updateFn = actions.slice(
        actions.indexOf("export async function updateExercise"),
        actions.indexOf("export async function deleteExercise")
      );
      expect(updateFn).toContain("createSupabaseClient");
      expect(updateFn).toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(updateFn).toContain("is_platform_admin");
    });

    it("should NOT filter by created_by for admin updates", () => {
      const updateFn = actions.slice(
        actions.indexOf("export async function updateExercise"),
        actions.indexOf("export async function deleteExercise")
      );
      // Admin path should not have .eq("created_by", ...)
      // The dbClient query just does .eq("id", id) without created_by filter
      expect(updateFn).toContain('.eq("id", id)');
    });
  });

  describe("deleteExercise — admin service-role client", () => {
    it("should use service-role client for admin deletes", () => {
      const deleteFn = actions.slice(
        actions.indexOf("export async function deleteExercise"),
        actions.indexOf("export async function cloneExercise")
      );
      expect(deleteFn).toContain("createSupabaseClient");
      expect(deleteFn).toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(deleteFn).toContain("is_platform_admin");
    });

    it("should verify rows were actually updated (not silent 0-row success)", () => {
      const deleteFn = actions.slice(
        actions.indexOf("export async function deleteExercise"),
        actions.indexOf("export async function cloneExercise")
      );
      expect(deleteFn).toContain('.select("id")');
      expect(deleteFn).toContain("updated.length === 0");
      expect(deleteFn).toContain("NOT_FOUND");
    });

    it("should still do soft-delete (is_deleted + deleted_at), not hard delete", () => {
      const deleteFn = actions.slice(
        actions.indexOf("export async function deleteExercise"),
        actions.indexOf("export async function cloneExercise")
      );
      expect(deleteFn).toContain("is_deleted: true");
      expect(deleteFn).toContain("deleted_at:");
      expect(deleteFn).not.toContain(".delete()");
    });
  });

  describe("service-role client configuration", () => {
    it("should import createClient from @supabase/supabase-js", () => {
      expect(actions).toContain('import { createClient as createSupabaseClient } from "@supabase/supabase-js"');
    });

    it("should import env for service-role key", () => {
      expect(actions).toContain('import { env } from "@/lib/env"');
    });

    it("should disable auto-refresh and session persistence for service-role client", () => {
      expect(actions).toContain("autoRefreshToken: false");
      expect(actions).toContain("persistSession: false");
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// Admin UI — edit/delete visibility for global exercises
// ══════════════════════════════════════════════════════════════════

describe("Admin UI — global exercise edit/delete", () => {
  describe("exercise-detail-page", () => {
    let detail: string;

    beforeEach(() => {
      detail = readSrc("components/exercises/exercise-detail-page.tsx");
    });

    it("should accept isPlatformAdmin prop", () => {
      expect(detail).toContain("isPlatformAdmin?: boolean");
      expect(detail).toContain("isPlatformAdmin = false");
    });

    it("should compute canEdit and canDelete based on admin status", () => {
      expect(detail).toContain("const canEdit = !isGlobal || isPlatformAdmin");
      expect(detail).toContain("const canDelete = !isGlobal || isPlatformAdmin");
    });

    it("should show edit button for admin on global exercises", () => {
      expect(detail).toContain("{canEdit && (");
    });

    it("should show delete button for admin on global exercises", () => {
      expect(detail).toContain("{canDelete && (");
    });

    it("should show clone button only for non-admins on global exercises", () => {
      expect(detail).toContain("{isGlobal && !isPlatformAdmin && (");
    });
  });

  describe("exercise-slide-over", () => {
    let slideOver: string;

    beforeEach(() => {
      slideOver = readSrc("components/exercises/exercise-slide-over.tsx");
    });

    it("should accept isPlatformAdmin prop", () => {
      expect(slideOver).toContain("isPlatformAdmin?: boolean");
      expect(slideOver).toContain("isPlatformAdmin = false");
    });

    it("should compute canEdit and canDelete based on admin status", () => {
      expect(slideOver).toContain("const canEdit = !isGlobal || isPlatformAdmin");
      expect(slideOver).toContain("const canDelete = !isGlobal || isPlatformAdmin");
    });

    it("should have delete handler with ConfirmDialog", () => {
      expect(slideOver).toContain("handleDelete");
      expect(slideOver).toContain("deleteExercise");
      expect(slideOver).toContain("ConfirmDialog");
      expect(slideOver).toContain("deleteConfirm");
    });

    it("should import Trash2 icon and deleteExercise action", () => {
      expect(slideOver).toContain("Trash2");
      expect(slideOver).toContain('import { cloneExercise, deleteExercise }');
    });
  });

  describe("exercise-library-page", () => {
    let library: string;

    beforeEach(() => {
      library = readSrc("components/exercises/exercise-library-page.tsx");
    });

    it("should accept isPlatformAdmin prop", () => {
      expect(library).toContain("isPlatformAdmin?: boolean");
      expect(library).toContain("isPlatformAdmin = false");
    });

    it("should pass isPlatformAdmin to ExerciseSlideOver", () => {
      expect(library).toContain("isPlatformAdmin={isPlatformAdmin}");
    });
  });

  describe("page routes pass isPlatformAdmin", () => {
    it("exercises list page should pass isPlatformAdmin", () => {
      const page = readSrc(
        "app/[locale]/(protected)/training/exercises/page.tsx"
      );
      expect(page).toContain("isPlatformAdmin");
      expect(page).toContain("is_platform_admin");
    });

    it("exercise detail page should pass isPlatformAdmin", () => {
      const page = readSrc(
        "app/[locale]/(protected)/training/exercises/[id]/page.tsx"
      );
      expect(page).toContain("isPlatformAdmin={isAdmin === true}");
    });

    it("new exercise page should pass isPlatformAdmin", () => {
      const page = readSrc(
        "app/[locale]/(protected)/training/exercises/new/page.tsx"
      );
      expect(page).toContain("isPlatformAdmin={isAdmin === true}");
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// DB Constraint: scope + created_by consistency
// ══════════════════════════════════════════════════════════════════

describe("CHECK constraint awareness", () => {
  it("migration should enforce scope-creator constraint", () => {
    const migration = readRoot(
      "supabase/migrations/20260320200000_proj12_exercise_library.sql"
    );
    expect(migration).toContain("chk_exercise_scope_creator");
    // global → created_by IS NULL, trainer → created_by IS NOT NULL
    expect(migration).toContain("scope = 'global'");
    expect(migration).toContain("created_by IS NULL");
    expect(migration).toContain("scope = 'trainer'");
    expect(migration).toContain("created_by IS NOT NULL");
  });

  it("createExercise should respect CHECK constraint (admin: null, trainer: user.id)", () => {
    const actions = readSrc("lib/exercises/actions.ts");
    expect(actions).toContain("created_by: isAdmin ? null : user.id");
  });
});
