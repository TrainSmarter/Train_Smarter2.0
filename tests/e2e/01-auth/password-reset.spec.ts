import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Password reset tests run WITHOUT cached auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Forgot Password Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/de/forgot-password");
  });

  test("page renders correctly", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Passwort vergessen" })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Link senden" })).toBeVisible();
  });

  test("shows success message after submitting email", async ({ page }) => {
    await page.locator('input[name="email"]').fill("test-trainer@train-smarter.at");
    await page.getByRole("button", { name: "Link senden" }).click();

    // Success state — always shown (prevents account enumeration)
    await expect(page.getByText("E-Mail gesendet")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText("Wenn ein Konto mit dieser E-Mail existiert")
    ).toBeVisible();
  });

  test("shows success even for non-existent email (anti-enumeration)", async ({ page }) => {
    await page.locator('input[name="email"]').fill("nobody-exists@example.com");
    await page.getByRole("button", { name: "Link senden" }).click();

    await expect(page.getByText("E-Mail gesendet")).toBeVisible({ timeout: 10_000 });
  });

  test("back to login link works", async ({ page }) => {
    await page.getByRole("link", { name: "Zurück zum Login" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("has no critical accessibility violations", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
  });
});

test.describe("Reset Password Page States", () => {
  test("shows expired state for invalid token", async ({ page }) => {
    await page.goto("/de/reset-password?token_hash=invalid_token&type=recovery");

    // Should show expired/error state
    await expect(
      page.getByText(/abgelaufen|Fehler|Neuen Link anfordern/)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows error state for missing parameters", async ({ page }) => {
    await page.goto("/de/reset-password");

    // Without any token params, should show error or redirect
    await expect(
      page.getByText(/abgelaufen|Fehler|Neuen Link anfordern/)
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/de/login");
  });

  test("page renders with all elements", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Willkommen zurück" })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Passwort vergessen?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jetzt registrieren" })).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.locator('input[name="email"]').fill("wrong@example.com");
    await page.locator('input[name="password"]').fill("WrongPassword123");
    await page.getByRole("button", { name: "Anmelden" }).click();

    await expect(
      page.getByText("E-Mail oder Passwort ist falsch")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows confirmed message when redirected from email confirmation", async ({ page }) => {
    await page.goto("/de/login?confirmed=true");

    await expect(
      page.getByText("E-Mail-Adresse wurde erfolgreich bestätigt")
    ).toBeVisible();
  });

  test("navigates to forgot-password page", async ({ page }) => {
    await page.getByRole("link", { name: "Passwort vergessen?" }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("navigates to register page", async ({ page }) => {
    await page.getByRole("link", { name: "Jetzt registrieren" }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("has no critical accessibility violations", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
  });
});
