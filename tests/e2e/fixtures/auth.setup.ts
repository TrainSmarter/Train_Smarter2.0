import { test as setup, expect } from "@playwright/test";

const TRAINER_EMAIL = process.env.E2E_TRAINER_EMAIL || "test-trainer@train-smarter.at";
const TRAINER_PASSWORD = process.env.E2E_TRAINER_PASSWORD;
const ATHLETE_EMAIL = process.env.E2E_ATHLETE_EMAIL || "test-athlete@train-smarter.at";
const ATHLETE_PASSWORD = process.env.E2E_ATHLETE_PASSWORD;

const TRAINER_STATE = "tests/e2e/.auth/trainer.json";
const ATHLETE_STATE = "tests/e2e/.auth/athlete.json";

setup("authenticate as trainer", async ({ page }) => {
  if (!TRAINER_PASSWORD) {
    setup.skip();
    return;
  }

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
  if (!ATHLETE_PASSWORD) {
    setup.skip();
    return;
  }

  await page.goto("/de/login");

  await page.locator('input[name="email"]').fill(ATHLETE_EMAIL);
  await page.locator('input[name="password"]').fill(ATHLETE_PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();

  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page).toHaveURL(/\/de\/dashboard/);

  await page.context().storageState({ path: ATHLETE_STATE });
});
