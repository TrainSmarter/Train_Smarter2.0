import { describe, it, expect, vi, afterEach } from "vitest";

// Mock next-intl before importing the hook
vi.mock("next-intl", () => ({
  useLocale: vi.fn(),
}));

import { useLocale } from "next-intl";
import { useTypedLocale } from "./use-typed-locale";

const mockUseLocale = vi.mocked(useLocale);

describe("useTypedLocale", () => {
  afterEach(() => {
    mockUseLocale.mockReset();
  });

  it('returns "de" when next-intl useLocale returns "de"', () => {
    mockUseLocale.mockReturnValue("de");
    const result = useTypedLocale();
    expect(result).toBe("de");
  });

  it('returns "en" when next-intl useLocale returns "en"', () => {
    mockUseLocale.mockReturnValue("en");
    const result = useTypedLocale();
    expect(result).toBe("en");
  });

  it("calls useLocale from next-intl", () => {
    mockUseLocale.mockReturnValue("de");
    useTypedLocale();
    expect(mockUseLocale).toHaveBeenCalled();
  });
});
