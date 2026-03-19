import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSessionCookies,
  setSessionCookies,
  getClearSessionCookies,
  clearSessionMarkers,
} from "./auth-utils";

describe("getSessionCookies", () => {
  describe("when rememberMe is true", () => {
    it("sets ts_remember with 30-day Max-Age", () => {
      const [cookieA] = getSessionCookies(true);
      expect(cookieA).toBe(
        "ts_remember=1; path=/; SameSite=Lax; Max-Age=2592000"
      );
    });

    it("clears ts_session (Max-Age=0)", () => {
      const [, cookieB] = getSessionCookies(true);
      expect(cookieB).toBe("ts_session=; path=/; SameSite=Lax; Max-Age=0");
    });
  });

  describe("when rememberMe is false", () => {
    it("sets ts_session as session cookie (no Max-Age)", () => {
      const [cookieA] = getSessionCookies(false);
      expect(cookieA).toBe("ts_session=1; path=/; SameSite=Lax");
      expect(cookieA).not.toContain("Max-Age");
    });

    it("clears ts_remember (Max-Age=0)", () => {
      const [, cookieB] = getSessionCookies(false);
      expect(cookieB).toBe("ts_remember=; path=/; SameSite=Lax; Max-Age=0");
    });
  });
});

describe("setSessionCookies", () => {
  let cookieWrites: string[];

  beforeEach(() => {
    cookieWrites = [];
    Object.defineProperty(document, "cookie", {
      set: (val: string) => cookieWrites.push(val),
      get: () => "",
      configurable: true,
    });
  });

  it("writes two cookies when rememberMe is true", () => {
    setSessionCookies(true);
    expect(cookieWrites).toHaveLength(2);
    expect(cookieWrites[0]).toContain("ts_remember=1");
    expect(cookieWrites[1]).toContain("ts_session=;");
  });

  it("writes two cookies when rememberMe is false", () => {
    setSessionCookies(false);
    expect(cookieWrites).toHaveLength(2);
    expect(cookieWrites[0]).toContain("ts_session=1");
    expect(cookieWrites[1]).toContain("ts_remember=;");
  });
});

describe("getClearSessionCookies", () => {
  it("clears ts_session with Max-Age=0", () => {
    const [cookieA] = getClearSessionCookies();
    expect(cookieA).toBe("ts_session=; path=/; SameSite=Lax; Max-Age=0");
  });

  it("clears ts_remember with Max-Age=0", () => {
    const [, cookieB] = getClearSessionCookies();
    expect(cookieB).toBe("ts_remember=; path=/; SameSite=Lax; Max-Age=0");
  });
});

describe("clearSessionMarkers", () => {
  let cookieWrites: string[];
  const removeItemSpy = vi.fn();

  beforeEach(() => {
    cookieWrites = [];
    Object.defineProperty(document, "cookie", {
      set: (val: string) => cookieWrites.push(val),
      get: () => "",
      configurable: true,
    });
    Object.defineProperty(window, "localStorage", {
      value: { removeItem: removeItemSpy, getItem: vi.fn(), setItem: vi.fn() },
      configurable: true,
      writable: true,
    });
    removeItemSpy.mockClear();
  });

  it("clears ts_session cookie", () => {
    clearSessionMarkers();
    expect(cookieWrites).toContain(
      "ts_session=; path=/; SameSite=Lax; Max-Age=0"
    );
  });

  it("clears ts_remember cookie", () => {
    clearSessionMarkers();
    expect(cookieWrites).toContain(
      "ts_remember=; path=/; SameSite=Lax; Max-Age=0"
    );
  });

  it("removes legacy ts_no_remember from localStorage", () => {
    clearSessionMarkers();
    expect(removeItemSpy).toHaveBeenCalledWith("ts_no_remember");
  });
});
