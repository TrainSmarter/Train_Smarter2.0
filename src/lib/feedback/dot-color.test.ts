import { describe, it, expect } from "vitest";
import {
  hasRealValues,
  computeDotColor,
  type CheckinEntryValues,
} from "./dot-color";

// ═══════════════════════════════════════════════════════════════
// 1. hasRealValues
// ═══════════════════════════════════════════════════════════════

describe("hasRealValues", () => {
  it("returns false for empty values object", () => {
    expect(hasRealValues({ values: {} })).toBe(false);
  });

  it("returns false when all numericValues are null and textValues are null", () => {
    expect(
      hasRealValues({
        values: {
          a: { numericValue: null, textValue: null },
          b: { numericValue: null, textValue: null },
        },
      })
    ).toBe(false);
  });

  it("returns false when textValue is empty string", () => {
    expect(
      hasRealValues({
        values: { a: { numericValue: null, textValue: "" } },
      })
    ).toBe(false);
  });

  it("returns true when any numericValue is non-null", () => {
    expect(
      hasRealValues({
        values: { a: { numericValue: 80, textValue: null } },
      })
    ).toBe(true);
  });

  it("returns true when numericValue is 0 (zero counts as real)", () => {
    expect(
      hasRealValues({
        values: { a: { numericValue: 0, textValue: null } },
      })
    ).toBe(true);
  });

  it("returns true when textValue is non-empty", () => {
    expect(
      hasRealValues({
        values: { a: { numericValue: null, textValue: "some note" } },
      })
    ).toBe(true);
  });

  it("returns true if at least one of multiple values is real", () => {
    expect(
      hasRealValues({
        values: {
          a: { numericValue: null, textValue: null },
          b: { numericValue: null, textValue: null },
          c: { numericValue: 42, textValue: null },
        },
      })
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. computeDotColor — no required fields
// ═══════════════════════════════════════════════════════════════

describe("computeDotColor — no required fields", () => {
  it("returns 'none' when no entries and no required fields", () => {
    expect(computeDotColor("2026-03-19", new Set())).toBe("none");
  });

  it("returns 'none' when no entries, undefined requiredCategoryIds", () => {
    expect(
      computeDotColor("2026-03-19", new Set(), undefined, undefined, "2026-03-19")
    ).toBe("none");
  });

  it("returns 'none' when no entries, empty requiredCategoryIds", () => {
    expect(
      computeDotColor("2026-03-19", new Set(), [], undefined, "2026-03-19")
    ).toBe("none");
  });

  it("returns 'green' when has real entries and no required fields", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-19": { values: { weight: { numericValue: 80, textValue: null } } },
    };
    expect(
      computeDotColor("2026-03-19", new Set(["2026-03-19"]), [], checkins, "2026-03-19")
    ).toBe("green");
  });

  it("returns 'none' when filledDates has date but no real values (empty DB record)", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-19": { values: { weight: { numericValue: null, textValue: null } } },
    };
    expect(
      computeDotColor("2026-03-19", new Set(["2026-03-19"]), [], checkins, "2026-03-19")
    ).toBe("none");
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. computeDotColor — with required fields
// ═══════════════════════════════════════════════════════════════

describe("computeDotColor — with required fields", () => {
  const required = ["cat-weight", "cat-steps", "cat-calories"];

  it("returns 'red' when required fields defined but no entries at all", () => {
    expect(
      computeDotColor("2026-03-18", new Set(), required, {}, "2026-03-19")
    ).toBe("red");
  });

  it("returns 'red' when filledDates has date but all values are null", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-18": {
        values: {
          "cat-weight": { numericValue: null, textValue: null },
          "cat-steps": { numericValue: null, textValue: null },
        },
      },
    };
    expect(
      computeDotColor("2026-03-18", new Set(["2026-03-18"]), required, checkins, "2026-03-19")
    ).toBe("red");
  });

  it("returns 'yellow' when some but not all required fields filled", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-18": {
        values: {
          "cat-weight": { numericValue: 80, textValue: null },
          "cat-steps": { numericValue: null, textValue: null },
          "cat-calories": { numericValue: null, textValue: null },
        },
      },
    };
    expect(
      computeDotColor("2026-03-18", new Set(["2026-03-18"]), required, checkins, "2026-03-19")
    ).toBe("yellow");
  });

  it("returns 'green' when all required fields filled", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-18": {
        values: {
          "cat-weight": { numericValue: 80, textValue: null },
          "cat-steps": { numericValue: 7500, textValue: null },
          "cat-calories": { numericValue: 2200, textValue: null },
        },
      },
    };
    expect(
      computeDotColor("2026-03-18", new Set(["2026-03-18"]), required, checkins, "2026-03-19")
    ).toBe("green");
  });

  it("returns 'green' when required fields filled with 0 (zero counts)", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-18": {
        values: {
          "cat-weight": { numericValue: 0, textValue: null },
          "cat-steps": { numericValue: 0, textValue: null },
          "cat-calories": { numericValue: 0, textValue: null },
        },
      },
    };
    expect(
      computeDotColor("2026-03-18", new Set(["2026-03-18"]), required, checkins, "2026-03-19")
    ).toBe("green");
  });

  it("returns 'yellow' when only non-required fields are filled", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-18": {
        values: {
          "cat-fat": { numericValue: 50, textValue: null }, // not in required
        },
      },
    };
    expect(
      computeDotColor("2026-03-18", new Set(["2026-03-18"]), required, checkins, "2026-03-19")
    ).toBe("yellow");
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. computeDotColor — future dates
// ═══════════════════════════════════════════════════════════════

describe("computeDotColor — future dates", () => {
  it("returns 'none' for future date even with required fields", () => {
    expect(
      computeDotColor("2026-03-20", new Set(), ["cat-weight"], {}, "2026-03-19")
    ).toBe("none");
  });

  it("returns 'none' for future date even with entries", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-20": {
        values: { "cat-weight": { numericValue: 80, textValue: null } },
      },
    };
    expect(
      computeDotColor(
        "2026-03-20",
        new Set(["2026-03-20"]),
        ["cat-weight"],
        checkins,
        "2026-03-19"
      )
    ).toBe("none");
  });

  it("returns correct color for today (not future)", () => {
    expect(
      computeDotColor("2026-03-19", new Set(), ["cat-weight"], {}, "2026-03-19")
    ).toBe("red");
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. computeDotColor — edge cases
// ═══════════════════════════════════════════════════════════════

describe("computeDotColor — edge cases", () => {
  it("returns 'none' when today is undefined and no entries", () => {
    expect(computeDotColor("2026-03-19", new Set())).toBe("none");
  });

  it("handles date in filledDates but not in checkinValues", () => {
    // filledDates says filled, but no matching entry in checkinValues
    expect(
      computeDotColor("2026-03-19", new Set(["2026-03-19"]), [], undefined, "2026-03-19")
    ).toBe("none"); // no real values because checkinValues is undefined
  });

  it("handles single required field", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-18": {
        values: { "cat-weight": { numericValue: 80, textValue: null } },
      },
    };
    expect(
      computeDotColor(
        "2026-03-18",
        new Set(["2026-03-18"]),
        ["cat-weight"],
        checkins,
        "2026-03-19"
      )
    ).toBe("green");
  });

  it("text-only entries count as real values for hasAnyEntry", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-18": {
        values: { "cat-note": { numericValue: null, textValue: "feeling good" } },
      },
    };
    // Has a real entry (text), but required field cat-weight is not filled
    expect(
      computeDotColor(
        "2026-03-18",
        new Set(["2026-03-18"]),
        ["cat-weight"],
        checkins,
        "2026-03-19"
      )
    ).toBe("yellow");
  });

  it("text-only entry with no required fields → green", () => {
    const checkins: Record<string, CheckinEntryValues> = {
      "2026-03-18": {
        values: { "cat-note": { numericValue: null, textValue: "note" } },
      },
    };
    expect(
      computeDotColor("2026-03-18", new Set(["2026-03-18"]), [], checkins, "2026-03-19")
    ).toBe("green");
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. i18n — streak plural syntax
// ═══════════════════════════════════════════════════════════════

describe("i18n: streak plural syntax", () => {
  const fs = require("fs");
  const path = require("path");
  const root = path.resolve(__dirname, "../../..");

  const de = fs.readFileSync(path.join(root, "src/messages/de.json"), "utf-8");
  const en = fs.readFileSync(path.join(root, "src/messages/en.json"), "utf-8");

  it("de.json streakDays uses ICU plural syntax", () => {
    expect(de).toContain("{count, plural,");
    expect(de).toContain("one {# Tag in Folge}");
    expect(de).toContain("other {# Tage in Folge}");
  });

  it("en.json streakDays uses ICU plural syntax", () => {
    expect(en).toContain("{count, plural,");
    expect(en).toContain("one {# day in a row}");
    expect(en).toContain("other {# days in a row}");
  });
});
