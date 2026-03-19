import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SessionManager } from "./session-manager";

describe("SessionManager", () => {
  it("renders without errors", () => {
    expect(() => render(<SessionManager />)).not.toThrow();
  });

  it("returns null (no DOM output)", () => {
    const { container } = render(<SessionManager />);
    expect(container.innerHTML).toBe("");
  });
});
