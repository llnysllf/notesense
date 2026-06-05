import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      throw new Error(message.text());
    }
  });
});

test("loads with no automated accessibility violations", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start drill" })).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test("runs the note-reading practice loop", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Answer C" })).toBeDisabled();
  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(page.getByRole("button", { name: "Answer C" })).toBeEnabled();

  await page.getByRole("button", { name: "Answer C" }).click();
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");

  await page.getByRole("button", { name: "Finish round" }).click();
  await expect(page.getByRole("heading", { name: "Last round" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Practice history" })).toBeVisible();
  await expect(page.getByRole("listitem", { name: /Note reading session/ })).toBeVisible();

  const postRoundAccessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(postRoundAccessibilityScanResults.violations).toEqual([]);

  await page.reload();
  await expect(page.getByRole("listitem", { name: /Note reading session/ })).toBeVisible();
});

test("exports local practice data", async ({ page }) => {
  await page.goto("/");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^notesense-progress-\d{4}-\d{2}-\d{2}\.json$/);
});

test("surfaces storage failures without crashing", async ({ page }) => {
  await page.addInitScript(() => {
    const storagePrototype = Object.getPrototypeOf(window.localStorage) as Storage;
    const originalSetItem = storagePrototype.setItem;

    storagePrototype.setItem = function setItem(key: string, value: string) {
      if (key.startsWith("notesense.")) {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }

      return originalSetItem.call(this, key, value);
    };
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Start drill" }).click();
  await page.getByRole("button", { name: "Answer C" }).click();

  await expect(page.getByRole("status")).toHaveText("Progress is not being saved on this device right now.");
});

test("runs the pitch-training practice loop", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Pitch training" }).click();
  await expect(page.getByLabel("Hidden pitch note")).toBeVisible();

  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(page.getByRole("button", { name: "Answer B" })).toBeEnabled();

  await page.getByRole("button", { name: "Answer C" }).click();
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");
});

test("keeps the responsive layout inside the viewport", async ({ page }) => {
  await page.goto("/");

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);
});
