import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// Mock the email validation module so we don't trigger real DNS lookups
vi.mock("@/lib/validation/email", () => ({
  validateEmailPlausibility: vi.fn(),
}));

import { validateEmailPlausibility } from "@/lib/validation/email";

const mockValidate = vi.mocked(validateEmailPlausibility);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonRequest(
  body: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request("http://localhost:3000/api/validate-email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("POST /api/validate-email — success", () => {
  it("returns 200 with { valid: true } for a valid email", async () => {
    mockValidate.mockResolvedValue({ valid: true });

    const response = await POST(jsonRequest({ email: "user@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ valid: true });
    expect(mockValidate).toHaveBeenCalledWith("user@example.com");
  });

  it("returns 200 with { valid: false, reason } for invalid domain", async () => {
    mockValidate.mockResolvedValue({ valid: false, reason: "no_mx_record" });

    const response = await POST(
      jsonRequest({ email: "user@nonexistent-domain.test" })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ valid: false, reason: "no_mx_record" });
  });
});

// ---------------------------------------------------------------------------
// Validation errors — 400
// ---------------------------------------------------------------------------

describe("POST /api/validate-email — validation errors", () => {
  it("returns 400 when body is empty", async () => {
    const request = new Request(
      "http://localhost:3000/api/validate-email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.2",
        },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ valid: false, reason: "invalid_format" });
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("returns 400 when email field is not a valid email", async () => {
    const response = await POST(
      jsonRequest(
        { email: "not-an-email" },
        { "x-forwarded-for": "127.0.0.3" }
      )
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ valid: false, reason: "invalid_format" });
  });

  it("returns 400 when body is not valid JSON", async () => {
    const request = new Request(
      "http://localhost:3000/api/validate-email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.4",
        },
        body: "not json {{{",
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ valid: false, reason: "invalid_format" });
  });

  it("returns 400 when content-type is not application/json", async () => {
    const request = new Request(
      "http://localhost:3000/api/validate-email",
      {
        method: "POST",
        headers: {
          "content-type": "text/plain",
          "x-forwarded-for": "127.0.0.5",
        },
        body: JSON.stringify({ email: "user@example.com" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ valid: false, reason: "invalid_format" });
  });
});

// ---------------------------------------------------------------------------
// Rate limiting — 429
// ---------------------------------------------------------------------------

describe("POST /api/validate-email — rate limiting", () => {
  it("returns 429 after exceeding rate limit", async () => {
    mockValidate.mockResolvedValue({ valid: true });

    // The rate limit is 30 requests per minute per IP.
    // Use a unique IP for this test to avoid interference.
    const ip = "10.99.99.99";

    // Send 30 requests (all should succeed)
    for (let i = 0; i < 30; i++) {
      const response = await POST(
        jsonRequest({ email: "user@example.com" }, { "x-forwarded-for": ip })
      );
      expect(response.status).toBe(200);
    }

    // The 31st request should be rate-limited
    const rateLimited = await POST(
      jsonRequest({ email: "user@example.com" }, { "x-forwarded-for": ip })
    );
    const data = await rateLimited.json();

    expect(rateLimited.status).toBe(429);
    expect(data).toEqual({ error: "Too many requests" });
  });

  it("does not rate limit different IPs independently", async () => {
    mockValidate.mockResolvedValue({ valid: true });

    // IP A gets some requests
    for (let i = 0; i < 5; i++) {
      await POST(
        jsonRequest(
          { email: "user@example.com" },
          { "x-forwarded-for": "10.1.1.1" }
        )
      );
    }

    // IP B should not be affected
    const response = await POST(
      jsonRequest(
        { email: "user@example.com" },
        { "x-forwarded-for": "10.2.2.2" }
      )
    );
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// HTTP method — only POST is exported
// ---------------------------------------------------------------------------

describe("POST /api/validate-email — method handling", () => {
  it("only exports POST handler (no GET, PUT, DELETE)", async () => {
    // The route module only exports POST. In Next.js App Router, requesting
    // with a method that has no export results in a 405. We verify this by
    // checking the module exports directly.
    const routeModule = await import("./route");
    expect(routeModule.POST).toBeDefined();
    expect((routeModule as Record<string, unknown>).GET).toBeUndefined();
    expect((routeModule as Record<string, unknown>).PUT).toBeUndefined();
    expect((routeModule as Record<string, unknown>).DELETE).toBeUndefined();
  });
});
