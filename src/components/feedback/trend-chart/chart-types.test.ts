import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CHART_COLORS,
  MAX_ACTIVE,
  AXIS_WIDTH,
  formatAxisTick,
  loadSettings,
  saveSettings,
} from "./chart-types";

// localStorage mock for jsdom compatibility
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

/**
 * Tests for PROJ-6 trend-chart/chart-types.ts (Finding #13 - refactor validation)
 *
 * Covers:
 * - CHART_COLORS constant
 * - MAX_ACTIVE constant
 * - AXIS_WIDTH constant
 * - formatAxisTick number formatting
 * - loadSettings/saveSettings localStorage integration
 */

// ══════════════════════════════════════════════════════════════════
// 1. Constants
// ══════════════════════════════════════════════════════════════════

describe("CHART_COLORS constant", () => {
  it("is an array with 8 color entries", () => {
    expect(Array.isArray(CHART_COLORS)).toBe(true);
    expect(CHART_COLORS).toHaveLength(8);
  });

  it("all entries are HSL CSS variable references", () => {
    for (const color of CHART_COLORS) {
      expect(color).toMatch(/^hsl\(var\(--chart-\d+\)\)$/);
    }
  });

  it("has sequential chart variable names from 1 to 8", () => {
    for (let i = 0; i < CHART_COLORS.length; i++) {
      expect(CHART_COLORS[i]).toContain(`--chart-${i + 1}`);
    }
  });
});

describe("MAX_ACTIVE constant", () => {
  it("is a number", () => {
    expect(typeof MAX_ACTIVE).toBe("number");
  });

  it("is set to 4 (reasonable limit for simultaneous chart lines)", () => {
    expect(MAX_ACTIVE).toBe(4);
  });

  it("is less than or equal to CHART_COLORS length", () => {
    expect(MAX_ACTIVE).toBeLessThanOrEqual(CHART_COLORS.length);
  });
});

describe("AXIS_WIDTH constant", () => {
  it("is a positive number", () => {
    expect(typeof AXIS_WIDTH).toBe("number");
    expect(AXIS_WIDTH).toBeGreaterThan(0);
  });

  it("is set to 35", () => {
    expect(AXIS_WIDTH).toBe(35);
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. formatAxisTick
// ══════════════════════════════════════════════════════════════════

describe("formatAxisTick", () => {
  it("formats values >= 10000 as rounded Xk (14000 -> '14k')", () => {
    expect(formatAxisTick(14000)).toBe("14k");
  });

  it("formats 10000 as '10k'", () => {
    expect(formatAxisTick(10000)).toBe("10k");
  });

  it("formats values >= 1000 with even thousands as Xk (2000 -> '2k')", () => {
    expect(formatAxisTick(2000)).toBe("2k");
  });

  it("formats values >= 1000 with decimals as X.Xk (2200 -> '2.2k')", () => {
    expect(formatAxisTick(2200)).toBe("2.2k");
  });

  it("formats 1500 as '1.5k'", () => {
    expect(formatAxisTick(1500)).toBe("1.5k");
  });

  it("formats small values as rounded integers (150 -> '150')", () => {
    expect(formatAxisTick(150)).toBe("150");
  });

  it("formats 0 as '0'", () => {
    expect(formatAxisTick(0)).toBe("0");
  });

  it("rounds small decimal values (99.7 -> '100')", () => {
    expect(formatAxisTick(99.7)).toBe("100");
  });

  it("handles negative values >= 10000 in absolute value", () => {
    expect(formatAxisTick(-14000)).toBe("-14k");
  });

  it("handles negative values >= 1000 in absolute value", () => {
    expect(formatAxisTick(-2000)).toBe("-2k");
  });

  it("handles negative small values", () => {
    expect(formatAxisTick(-50)).toBe("-50");
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. loadSettings / saveSettings (localStorage)
// ══════════════════════════════════════════════════════════════════

describe("loadSettings", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns default settings when localStorage is empty", () => {
    const result = loadSettings();
    expect(result).toEqual({ axes: {}, xRange: "7" });
  });

  it("returns stored settings when localStorage has data", () => {
    const stored = { axes: { cat1: { min: 0, max: 100 } }, xRange: "30" };
    localStorageMock.setItem("feedback-chart-axis-settings", JSON.stringify(stored));

    const result = loadSettings();
    expect(result.xRange).toBe("30");
    expect(result.axes).toEqual({ cat1: { min: 0, max: 100 } });
  });

  it("returns default axes when stored data has no axes key", () => {
    localStorageMock.setItem(
      "feedback-chart-axis-settings",
      JSON.stringify({ xRange: "14" })
    );

    const result = loadSettings();
    expect(result.axes).toEqual({});
    expect(result.xRange).toBe("14");
  });

  it("returns default xRange when stored data has no xRange key", () => {
    localStorageMock.setItem(
      "feedback-chart-axis-settings",
      JSON.stringify({ axes: { cat1: {} } })
    );

    const result = loadSettings();
    expect(result.xRange).toBe("7");
  });

  it("returns defaults when localStorage has invalid JSON", () => {
    localStorageMock.setItem("feedback-chart-axis-settings", "not-json!!!");

    const result = loadSettings();
    expect(result).toEqual({ axes: {}, xRange: "7" });
  });
});

describe("saveSettings", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("saves settings to localStorage under the correct key", () => {
    const settings = { axes: { cat1: { min: 0, max: 50 } }, xRange: "30" as const };
    saveSettings(settings as any);

    const stored = localStorageMock.getItem("feedback-chart-axis-settings");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.xRange).toBe("30");
    expect(parsed.axes.cat1).toEqual({ min: 0, max: 50 });
  });

  it("overwrites previously saved settings", () => {
    saveSettings({ axes: {}, xRange: "7" } as any);
    saveSettings({ axes: { cat2: {} }, xRange: "14" } as any);

    const stored = localStorageMock.getItem("feedback-chart-axis-settings");
    const parsed = JSON.parse(stored!);
    expect(parsed.xRange).toBe("14");
    expect(parsed.axes).toHaveProperty("cat2");
    expect(parsed.axes).not.toHaveProperty("cat1");
  });

  it("does not throw when localStorage.setItem throws", () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => {
      saveSettings({ axes: {}, xRange: "7" } as any);
    }).not.toThrow();
  });
});
