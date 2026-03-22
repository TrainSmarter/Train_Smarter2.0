import type { AxisSettingsData } from "./chart-settings";
import type { XRange } from "./chart-settings";

/** Chart color palette from design system */
export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
];

export const MAX_ACTIVE = 4;

/** Width per axis -- Recharts uses this for position calc + spacing between stacked axes */
export const AXIS_WIDTH = 35;

/** Format numbers compactly for narrow axes: 14000->14k, 2200->2.2k, 150->150 */
export function formatAxisTick(value: number): string {
  if (Math.abs(value) >= 10000) return `${Math.round(value / 1000)}k`;
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    return k === Math.floor(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(Math.round(value));
}

const STORAGE_KEY = "feedback-chart-axis-settings";

export interface StoredSettings {
  axes: AxisSettingsData;
  xRange: XRange;
}

export function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        axes: parsed.axes ?? {},
        xRange: parsed.xRange ?? "7",
      };
    }
  } catch {
    // ignore
  }
  return { axes: {}, xRange: "7" };
}

export function saveSettings(settings: StoredSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
