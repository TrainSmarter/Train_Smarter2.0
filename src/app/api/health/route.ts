import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * GET /api/health
 *
 * System health check endpoint. Verifies database connectivity, auth system,
 * data integrity (orphaned records, FK cascades), Edge Function deployment,
 * seed data, and RLS policy correctness.
 *
 * Authentication: requires an authenticated admin user (role includes "ADMIN")
 * OR the `x-health-api-key` header matching HEALTH_API_KEY env var.
 */

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message?: string;
  detail?: Record<string, unknown>;
}

export async function GET(request: Request) {
  try {
    // ── Authentication: admin user or API key ──
    const apiKey = request.headers.get("x-health-api-key");
    const envApiKey = process.env.HEALTH_API_KEY;

    let isAuthorized = false;

    // Option 1: API key header
    if (envApiKey && apiKey === envApiKey) {
      isAuthorized = true;
    }

    // Option 2: Authenticated admin user
    if (!isAuthorized) {
      try {
        const supabase = await createServerClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const roles = (user.app_metadata?.roles as string[]) ?? [];
          if (roles.includes("ADMIN")) {
            isAuthorized = true;
          }
        }
      } catch {
        // Auth check failed — fall through to unauthorized
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Create admin client with service role key ──
    const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Run all health checks ──
    const checks: CheckResult[] = [];

    // 1. Database connectivity
    checks.push(await checkDatabaseConnectivity(admin));

    // 2. Auth system
    checks.push(await checkAuthSystem(admin));

    // 3. Orphaned profiles
    checks.push(await checkOrphanedProfiles(admin));

    // 4. Orphaned references (user_consents, pending_deletions)
    checks.push(await checkOrphanedReferences(admin));

    // 5. FK integrity (pending_deletions CASCADE)
    checks.push(await checkFkIntegrity(admin));

    // 6. Edge Functions deployed
    checks.push(await checkEdgeFunctions(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY));

    // 7. Feedback categories seed data
    checks.push(await checkFeedbackCategories(admin));

    // 8. RLS check on user_consents
    checks.push(await checkUserConsentsRls(admin));

    // ── Determine overall status ──
    const hasFailure = checks.some((c) => c.status === "fail");
    const hasWarning = checks.some((c) => c.status === "warn");

    const status = hasFailure ? "unhealthy" : hasWarning ? "degraded" : "healthy";

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        checks,
      },
      {
        status: status === "unhealthy" ? 503 : 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("health check error:", err);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Health check failed unexpectedly",
      },
      { status: 500 }
    );
  }
}

// ── Individual check implementations ──

async function checkDatabaseConnectivity(
  admin: SupabaseClient
): Promise<CheckResult> {
  try {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) {
      return {
        name: "database_connectivity",
        status: "fail",
        message: "Cannot query database",
        detail: { error: error.message },
      };
    }

    void data;

    return {
      name: "database_connectivity",
      status: "pass",
      message: "Database is reachable",
    };
  } catch (err) {
    return {
      name: "database_connectivity",
      status: "fail",
      message: "Database connection failed",
      detail: { error: String(err) },
    };
  }
}

async function checkAuthSystem(
  admin: SupabaseClient
): Promise<CheckResult> {
  try {
    const {
      data: { users },
      error,
    } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (error) {
      return {
        name: "auth_system",
        status: "fail",
        message: "Cannot access auth.users",
        detail: { error: error.message },
      };
    }

    return {
      name: "auth_system",
      status: "pass",
      message: `Auth system accessible (${users?.length ?? 0} user(s) sampled)`,
    };
  } catch (err) {
    return {
      name: "auth_system",
      status: "fail",
      message: "Auth system check failed",
      detail: { error: String(err) },
    };
  }
}

async function checkOrphanedProfiles(
  admin: SupabaseClient
): Promise<CheckResult> {
  try {
    // Get all profile IDs
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id");

    if (profilesError) {
      return {
        name: "orphaned_profiles",
        status: "warn",
        message: "Could not query profiles",
        detail: { error: profilesError.message },
      };
    }

    if (!profiles || profiles.length === 0) {
      return {
        name: "orphaned_profiles",
        status: "pass",
        message: "No profiles to check",
      };
    }

    // Get all auth user IDs (paginate in batches)
    const authUserIds = new Set<string>();
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const {
        data: { users },
      } = await admin.auth.admin.listUsers({ page, perPage });

      if (!users || users.length === 0) {
        hasMore = false;
      } else {
        users.forEach((u) => authUserIds.add(u.id));
        if (users.length < perPage) hasMore = false;
        page++;
      }
    }

    const orphanedIds = profiles
      .filter((p) => !authUserIds.has(p.id))
      .map((p) => p.id);

    if (orphanedIds.length > 0) {
      return {
        name: "orphaned_profiles",
        status: "warn",
        message: `${orphanedIds.length} profile(s) without matching auth.users record`,
        detail: { count: orphanedIds.length, sample: orphanedIds.slice(0, 5) },
      };
    }

    return {
      name: "orphaned_profiles",
      status: "pass",
      message: `All ${profiles.length} profiles have matching auth.users records`,
    };
  } catch (err) {
    return {
      name: "orphaned_profiles",
      status: "warn",
      message: "Orphaned profiles check failed",
      detail: { error: String(err) },
    };
  }
}

async function checkOrphanedReferences(
  admin: SupabaseClient
): Promise<CheckResult> {
  try {
    // Get all auth user IDs
    const authUserIds = new Set<string>();
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const {
        data: { users },
      } = await admin.auth.admin.listUsers({ page, perPage });

      if (!users || users.length === 0) {
        hasMore = false;
      } else {
        users.forEach((u) => authUserIds.add(u.id));
        if (users.length < perPage) hasMore = false;
        page++;
      }
    }

    const orphaned: Record<string, number> = {};

    // Check user_consents
    const { data: consents } = await admin
      .from("user_consents")
      .select("user_id");

    if (consents) {
      const orphanedConsents = consents.filter(
        (c) => !authUserIds.has(c.user_id)
      );
      if (orphanedConsents.length > 0) {
        orphaned["user_consents"] = orphanedConsents.length;
      }
    }

    // Check pending_deletions
    const { data: deletions } = await admin
      .from("pending_deletions")
      .select("user_id");

    if (deletions) {
      const orphanedDeletions = deletions.filter(
        (d) => !authUserIds.has(d.user_id)
      );
      if (orphanedDeletions.length > 0) {
        orphaned["pending_deletions"] = orphanedDeletions.length;
      }
    }

    const totalOrphaned = Object.values(orphaned).reduce(
      (sum, n) => sum + n,
      0
    );

    if (totalOrphaned > 0) {
      return {
        name: "orphaned_references",
        status: "warn",
        message: `${totalOrphaned} orphaned reference(s) found`,
        detail: orphaned,
      };
    }

    return {
      name: "orphaned_references",
      status: "pass",
      message: "No orphaned references in user_consents or pending_deletions",
    };
  } catch (err) {
    return {
      name: "orphaned_references",
      status: "warn",
      message: "Orphaned references check failed",
      detail: { error: String(err) },
    };
  }
}

async function checkFkIntegrity(
  admin: SupabaseClient
): Promise<CheckResult> {
  try {
    // Query information_schema to verify critical FK constraints use CASCADE
    // delete_rule values: 'CASCADE', 'NO ACTION', 'RESTRICT', 'SET NULL', 'SET DEFAULT'
    const { data, error } = await admin.rpc("check_fk_cascade_config");

    if (error) {
      // The RPC might not exist yet — fall back to a warning
      return {
        name: "fk_integrity",
        status: "warn",
        message:
          "Cannot verify FK cascade config (RPC not available). Run the health_check_cleanup migration.",
        detail: { error: error.message },
      };
    }

    const issues: string[] = [];

    if (data && Array.isArray(data)) {
      for (const row of data) {
        if (row.delete_rule !== "CASCADE") {
          issues.push(
            `${row.table_name}.${row.constraint_name}: delete_rule=${row.delete_rule} (expected CASCADE)`
          );
        }
      }
    }

    if (issues.length > 0) {
      return {
        name: "fk_integrity",
        status: "fail",
        message: "FK cascade misconfiguration detected",
        detail: { issues },
      };
    }

    return {
      name: "fk_integrity",
      status: "pass",
      message: "Critical FK cascades are correctly configured",
    };
  } catch (err) {
    return {
      name: "fk_integrity",
      status: "warn",
      message: "FK integrity check failed",
      detail: { error: String(err) },
    };
  }
}

async function checkEdgeFunctions(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<CheckResult> {
  try {
    const requiredFunctions = ["send-auth-email", "send-invitation-email"];
    const results: Record<string, boolean> = {};

    for (const fnName of requiredFunctions) {
      try {
        // Try invoking with a HEAD-like request to see if the function exists
        // We use the Supabase functions invoke endpoint
        const response = await fetch(
          `${supabaseUrl}/functions/v1/${fnName}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ _healthcheck: true }),
          }
        );

        // 200, 400, 401, 422 all indicate the function is deployed
        // 404 means it is NOT deployed
        results[fnName] = response.status !== 404;
      } catch {
        results[fnName] = false;
      }
    }

    const missing = Object.entries(results)
      .filter(([, deployed]) => !deployed)
      .map(([name]) => name);

    if (missing.length > 0) {
      return {
        name: "edge_functions",
        status: "fail",
        message: `Missing Edge Functions: ${missing.join(", ")}`,
        detail: results,
      };
    }

    return {
      name: "edge_functions",
      status: "pass",
      message: "All required Edge Functions are deployed",
      detail: results,
    };
  } catch (err) {
    return {
      name: "edge_functions",
      status: "warn",
      message: "Edge Functions check failed",
      detail: { error: String(err) },
    };
  }
}

async function checkFeedbackCategories(
  admin: SupabaseClient
): Promise<CheckResult> {
  try {
    const expectedSlugs = [
      "weight",
      "steps",
      "calories",
      "carbs",
      "protein",
      "fat",
      "hunger",
      "menstruation",
      "illness",
      "soreness",
      "note",
    ];

    const { data: categories, error } = await admin
      .from("feedback_categories")
      .select("slug")
      .eq("scope", "global")
      .in("slug", expectedSlugs);

    if (error) {
      return {
        name: "feedback_categories",
        status: "warn",
        message: "Could not query feedback_categories",
        detail: { error: error.message },
      };
    }

    const foundSlugs = new Set((categories ?? []).map((c) => c.slug));
    const missing = expectedSlugs.filter((s) => !foundSlugs.has(s));

    if (missing.length > 0) {
      return {
        name: "feedback_categories",
        status: "fail",
        message: `Missing ${missing.length} of 11 global feedback categories`,
        detail: { missing },
      };
    }

    return {
      name: "feedback_categories",
      status: "pass",
      message: "All 11 global feedback categories are seeded",
    };
  } catch (err) {
    return {
      name: "feedback_categories",
      status: "warn",
      message: "Feedback categories check failed",
      detail: { error: String(err) },
    };
  }
}

async function checkUserConsentsRls(
  admin: SupabaseClient
): Promise<CheckResult> {
  try {
    // Use the RPC to check if UPDATE/DELETE policies exist on user_consents
    const { data, error } = await admin.rpc("check_user_consents_rls");

    if (error) {
      // RPC might not exist yet — fall back to warning
      return {
        name: "user_consents_rls",
        status: "warn",
        message:
          "Cannot verify user_consents RLS (RPC not available). Run the health_check_cleanup migration.",
        detail: { error: error.message },
      };
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const policyNames = data.map(
        (r: { policyname: string; cmd: string }) =>
          `${r.policyname} (${r.cmd})`
      );
      return {
        name: "user_consents_rls",
        status: "fail",
        message:
          "user_consents has UPDATE/DELETE RLS policies (should be append-only)",
        detail: { policies: policyNames },
      };
    }

    return {
      name: "user_consents_rls",
      status: "pass",
      message: "user_consents is correctly append-only (no UPDATE/DELETE policies)",
    };
  } catch (err) {
    return {
      name: "user_consents_rls",
      status: "warn",
      message: "user_consents RLS check failed",
      detail: { error: String(err) },
    };
  }
}
