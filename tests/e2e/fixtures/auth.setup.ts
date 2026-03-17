import { test as setup, expect } from "@playwright/test";

const TRAINER_EMAIL = process.env.E2E_TRAINER_EMAIL;
const TRAINER_PASSWORD = process.env.E2E_TRAINER_PASSWORD;
const ATHLETE_EMAIL = process.env.E2E_ATHLETE_EMAIL;
const ATHLETE_PASSWORD = process.env.E2E_ATHLETE_PASSWORD;

if (!TRAINER_EMAIL || !TRAINER_PASSWORD) {
  throw new Error(
    "E2E test credentials not configured. Set E2E_TRAINER_EMAIL and E2E_TRAINER_PASSWORD environment variables."
  );
}
if (!ATHLETE_EMAIL || !ATHLETE_PASSWORD) {
  throw new Error(
    "E2E test credentials not configured. Set E2E_ATHLETE_EMAIL and E2E_ATHLETE_PASSWORD environment variables."
  );
}

const TRAINER_STATE = "tests/e2e/.auth/trainer.json";
const ATHLETE_STATE = "tests/e2e/.auth/athlete.json";

setup("authenticate as trainer", async ({ page }) => {
  await page.goto("/de/login");

  await page.locator('input[name="email"]').fill(TRAINER_EMAIL);
  await page.locator('input[name="password"]').fill(TRAINER_PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page).toHaveURL(/\/de\/dashboard/);

  await page.context().storageState({ path: TRAINER_STATE });
});

setup("authenticate as athlete", async ({ page }) => {
  await page.goto("/de/login");

  await page.locator('input[name="email"]').fill(ATHLETE_EMAIL);
  await page.locator('input[name="password"]').fill(ATHLETE_PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();

  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page).toHaveURL(/\/de\/dashboard/);

  await page.context().storageState({ path: ATHLETE_STATE });
});
