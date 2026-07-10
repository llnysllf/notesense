import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    Math.random = () => 0;
  });

  page.on("pageerror", (error) => {
    throw error;
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      throw new Error(message.text());
    }
  });
});

test("matches the note-reading shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();

  await expect(page).toHaveScreenshot("note-reading-shell.png", {
    fullPage: true,
  });
});

test("matches the pitch-training shell", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pitch training" }).click();
  await expect(page.getByLabel("Hidden pitch note")).toBeVisible();

  await expect(page).toHaveScreenshot("pitch-training-shell.png", {
    fullPage: true,
  });
});

// Brand-colored controls are a small share of full-page pixels, so a palette
// change can slip under the page-level diff ratio. These element snapshots
// are dominated by brand fills: any re-theme flips most of their pixels.
test("matches the brand accent controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();

  await expect(page.locator(".mode-switch")).toHaveScreenshot("brand-mode-switch.png", {
    maxDiffPixelRatio: 0.02,
  });
  await expect(page.locator(".primary-button")).toHaveScreenshot("brand-primary-button.png", {
    maxDiffPixelRatio: 0.02,
  });
});
