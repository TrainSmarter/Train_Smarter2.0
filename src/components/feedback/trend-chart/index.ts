/**
 * Trend chart module -- unified trend chart with sub-components.
 *
 * Public API:
 *   import { UnifiedTrendChart } from "@/components/feedback/trend-chart"
 *   import { TrendChart } from "@/components/feedback/trend-chart"
 */
export { UnifiedTrendChart } from "./unified-trend-chart";
export { TrendChart } from "./single-trend-chart";
export { ChartTooltip } from "./chart-tooltip";
export { ChartSettings, type XRange, type AxisSettingsData } from "./chart-settings";
export { ChartLegend } from "./chart-legend";
export {
  CHART_COLORS,
  MAX_ACTIVE,
  AXIS_WIDTH,
  formatAxisTick,
  loadSettings,
  saveSettings,
  type StoredSettings,
} from "./chart-types";
