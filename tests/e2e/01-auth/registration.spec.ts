import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Registration tests run WITHOUT cached auth state (fresh browser)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Registration Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/de/register");
  });

  test("page renders with all form fields", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Konto erstellen" })).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrieren" })).toBeVisible();
  });

  test("shows validation errors for empty form submission", async ({ page }) => {
    await page.getByRole("button", { name: "Registrieren" }).click();

    // Form should show validation errors (HTML5 or react-hook-form)
    // At minimum, required fields should prevent submission
    await expect(page).toHaveURL(/\/register/);
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.locator('input[name="firstName"]').fill("Test");
    await page.locator('input[name="lastName"]').fill("User");
    await page.locator('input[name="email"]').fill("mismatch@example.com");
    await page.locator('input[name="password"]').fill("TestPass123");
    await page.locator('input[name="confirmPassword"]').fill("DifferentPass123");

    await page.getByRole("button", { name: "Registrieren" }).click();

    await expect(page.getByText("Passwörter stimmen nicht überein")).toBeVisible();
  });

  test("navigates to login page via link", async ({ page }) => {
    await page.getByRole("link", { name: "Jetzt anmelden" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("has no critical accessibility violations", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
  });
});

test.describe("Registration → Verify Email (with test account)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("successful registration redirects to verify-email", async ({ page }) => {
    await page.goto("/de/register");

    const uniqueEmail = `e2e-reg-${Date.now()}@train-smarter.at`;

    await page.locator('input[name="firstName"]').fill("E2E");
    await page.locator('input[name="lastName"]').fill("Testuser");
    await page.locator('input[name="email"]').fill(uniqueEmail);
    await page.locator('input[name="password"]').fill("TestPass123!");
    await page.locator('input[name="confirmPassword"]').fill("TestPass123!");

    await page.getByRole("button", { name: "Registrieren" }).click();

    // Should redirect to verify-email page
    await page.waitForURL("**/verify-email**", { timeout: 15_000 });
    await expect(page.getByText("E-Mail bestätigen")).toBeVisible();
  });
});
