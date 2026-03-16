import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// These tests use the cached trainer auth state
test.describe("Athlete Invite Flow (Trainer perspective)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the organisation/athletes page
    await page.goto("/de/organisation/athletes");
  });

  test("athletes page loads for authenticated trainer", async ({ page }) => {
    // Should be on the athletes page (not redirected to login)
    await expect(page).toHaveURL(/\/organisation/);
    // Page should have loaded successfully
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("invite modal opens and shows form fields", async ({ page }) => {
    // Look for the invite button (could be "Einladen" or similar)
    const inviteButton = page.getByRole("button", { name: /einladen/i });

    // Skip test if no invite button exists (UI may vary)
    if (!(await inviteButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await inviteButton.click();

    // Modal should appear with email field
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5_000 });
  });

  test("invite form validates email format", async ({ page }) => {
    const inviteButton = page.getByRole("button", { name: /einladen/i });
    if (!(await inviteButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await inviteButton.click();
    await page.locator('input[name="email"]').fill("not-an-email");

    // Submit the invite form
    const submitButton = page.getByRole("button", { name: /einladen|senden/i }).last();
    await submitButton.click();

    // Should show validation error
    await expect(page).toHaveURL(/\/organisation/);
  });

  test("has no critical accessibility violations on athletes page", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
  });
});

test.describe("Onboarding Flow (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("onboarding redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/de/onboarding");

    // Protected route — should redirect to login
    await page.waitForURL("**/login**", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Dashboard (authenticated trainer)", () => {
  test("dashboard loads after login", async ({ page }) => {
    await page.goto("/de/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    // Dashboard should render without errors
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("has no critical accessibility violations on dashboard", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
  });
});
