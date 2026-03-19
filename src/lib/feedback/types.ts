/**
 * Feedback & Monitoring types — PROJ-6
 *
 * Types for the dynamic category-based check-in system
 * and the trainer monitoring dashboard.
 */

// ── Category System ──────────────────────────────────────────

export type CategoryType = "number" | "scale" | "text";
export type CategoryScope = "global" | "trainer" | "athlete";

export interface CategoryLabel {
  de: string;
  en: string;
}

export interface ScaleStepLabels {
  [step: string]: CategoryLabel;
}

export interface FeedbackCategory {
  id: string;
  name: CategoryLabel;
  slug: string;
  type: CategoryType;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  scaleLabels: ScaleStepLabels | null;
  isRequired: boolean;
  sortOrder: number;
  icon: string | null;
  scope: CategoryScope;
  createdBy: string | null;
  targetAthleteId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryOverride {
  id: string;
  userId: string;
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A category with its effective active state for a specific user */
export interface ActiveCategory extends FeedbackCategory {
  isActive: boolean;
}

// ── Backfill Mode ────────────────────────────────────────────

export type BackfillMode = "current_week" | "two_weeks" | "unlimited";

// ── Check-in System ──────────────────────────────────────────

export interface FeedbackCheckin {
  id: string;
  athleteId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackCheckinValue {
  id: string;
  checkinId: string;
  categoryId: string;
  athleteId: string;
  numericValue: number | null;
  textValue: string | null;
  createdAt: string;
}

/** Flattened check-in with all values for display */
export interface CheckinEntry {
  id: string;
  date: string;
  values: Record<string, { numericValue: number | null; textValue: string | null }>;
  createdAt: string;
  updatedAt: string;
}

// ── Monitoring Dashboard ─────────────────────────────────────

export type MonitoringViewMode =
  | "card-grid"
  | "table"
  | "alert"
  | "trend"
  | "calendar"
  | "heatmap"
  | "feed"
  | "ranking";

export type MonitoringTimeRange = "7" | "30" | "90";

export type AlertSeverity = "critical" | "warning";
export type CheckinStatus = "complete" | "partial" | "missing";
export type TrafficLight = "green" | "yellow" | "red";

export interface MonitoringAthleteSummary {
  athleteId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  teamId: string | null;
  teamName: string | null;
  lastCheckinDate: string | null;
  todayCheckinStatus: CheckinStatus;
  trafficLight: TrafficLight;
  streak: number;
  complianceRate: number; // 0-100
  weightTrend: number | null; // delta over 7 days
  latestWeight: number | null;
  canSeeAnalysis: boolean;
  /** @deprecated Use backfillMode instead */
  backfillDays: number;
  backfillMode: BackfillMode;
}

export interface MonitoringAlert {
  athleteId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  severity: AlertSeverity;
  type: "missing_checkin" | "low_scale" | "weight_change";
  message: string;
  detail: string;
}

export interface MonitoringOverview {
  totalAthletes: number;
  checkedInToday: number;
  averageCompliance: number;
  alertCount: number;
  athletes: MonitoringAthleteSummary[];
  alerts: MonitoringAlert[];
}

// ── Trend Chart Data ─────────────────────────────────────────

export interface TrendDataPoint {
  date: string;
  value: number | null;
}

export interface AthleteTrendData {
  categoryId: string;
  categoryName: CategoryLabel;
  categoryType: CategoryType;
  unit: string | null;
  data: TrendDataPoint[];
}

// ── Preferences (localStorage) ──────────────────────────────

export interface FeedbackPreferences {
  viewMode: MonitoringViewMode;
  timeRange: MonitoringTimeRange;
  filterTeam: string; // "all" or team ID
  filterStatus: string; // "all" | "complete" | "missing" | "alert"
}
