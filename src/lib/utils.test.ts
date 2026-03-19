import { describe, it, expect } from "vitest";
import { cn, getInitials, getNameInitials, getSafeAvatarUrl } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles empty string input", () => {
    expect(cn("", "text-sm")).toBe("text-sm");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("merges padding conflicts", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("keeps non-conflicting classes", () => {
    expect(cn("text-sm", "bg-red-500", "p-4")).toBe(
      "text-sm bg-red-500 p-4"
    );
  });
});

// ── getSafeAvatarUrl ─────────────────────────────────────────────

describe("getSafeAvatarUrl", () => {
  it("should return undefined for null input", () => {
    expect(getSafeAvatarUrl(undefined)).toBeUndefined();
  });

  it("should return undefined for undefined input", () => {
    expect(getSafeAvatarUrl(undefined)).toBeUndefined();
  });

  it("should return undefined for empty string", () => {
    expect(getSafeAvatarUrl("")).toBeUndefined();
  });

  it("should return the URL for a valid https URL", () => {
    const url = "https://example.com/avatar.jpg";
    expect(getSafeAvatarUrl(url)).toBe(url);
  });

  it("should return undefined for javascript: protocol (XSS)", () => {
    expect(getSafeAvatarUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("should return undefined for data: protocol (XSS)", () => {
    expect(
      getSafeAvatarUrl("data:text/html,<script>alert(1)</script>")
    ).toBeUndefined();
  });

  it("should return undefined for protocol-relative URLs", () => {
    // "//evil.com/avatar.jpg" is not a valid URL (no protocol), so new URL throws
    expect(getSafeAvatarUrl("//evil.com/avatar.jpg")).toBeUndefined();
  });

  it("should return the URL for a valid Supabase storage URL", () => {
    const url = "https://supabase.co/storage/avatars/123.jpg";
    expect(getSafeAvatarUrl(url)).toBe(url);
  });

  it("should return undefined for http: protocol (not secure)", () => {
    expect(getSafeAvatarUrl("http://example.com/avatar.jpg")).toBeUndefined();
  });

  it("should return undefined for ftp: protocol", () => {
    expect(getSafeAvatarUrl("ftp://example.com/avatar.jpg")).toBeUndefined();
  });

  it("should return undefined for malformed URL", () => {
    expect(getSafeAvatarUrl("not a url at all")).toBeUndefined();
  });

  it("should handle URL with query parameters", () => {
    const url = "https://cdn.example.com/avatar.jpg?w=100&h=100";
    expect(getSafeAvatarUrl(url)).toBe(url);
  });

  it("should handle URL with fragments", () => {
    const url = "https://cdn.example.com/avatar.jpg#section";
    expect(getSafeAvatarUrl(url)).toBe(url);
  });
});

// ── getInitials ──────────────────────────────────────────────────

describe("getInitials", () => {
  it("should return correct initials for normal names", () => {
    expect(getInitials("Max", "Mustermann")).toBe("MM");
  });

  it("should uppercase single-character names", () => {
    expect(getInitials("a", "b")).toBe("AB");
  });

  it("should return empty string for empty inputs", () => {
    expect(getInitials("", "")).toBe("");
  });

  it("should handle German umlauts correctly", () => {
    expect(getInitials("Über", "Größe")).toBe("ÜG");
  });

  it("should handle names with spaces (takes first char only)", () => {
    expect(getInitials("Anna Maria", "Schmidt")).toBe("AS");
  });

  it("should handle lowercase names by uppercasing", () => {
    expect(getInitials("max", "müller")).toBe("MM");
  });
});

// ── getNameInitials ──────────────────────────────────────────────

describe("getNameInitials", () => {
  it("should return initials from two-word name", () => {
    expect(getNameInitials("Team Alpha")).toBe("TA");
  });

  it("should return max 2 characters for multi-word names", () => {
    expect(getNameInitials("A Very Long Name")).toBe("AV");
  });

  it("should handle single-word name", () => {
    expect(getNameInitials("Alpha")).toBe("A");
  });

  it("should return empty string for empty input", () => {
    expect(getNameInitials("")).toBe("");
  });

  it("should handle lowercase input by uppercasing", () => {
    expect(getNameInitials("team beta")).toBe("TB");
  });
});
