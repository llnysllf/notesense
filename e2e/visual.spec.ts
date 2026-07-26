import { expect, test, type Page } from "@playwright/test";

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

// On phone-sized viewports the sidebar is an off-canvas drawer, so nav
// buttons are reachable only after tapping the topbar menu button.
async function openNavDrawerIfNeeded(page: Page) {
  const toggle = page.getByRole("button", { name: "Open menu" });
  if (await toggle.isVisible()) {
    await toggle.click();
  }
}

test("matches the note-reading shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start drill" })).toBeVisible();

  await expect(page).toHaveScreenshot("note-reading-shell.png", {
    fullPage: true,
  });
});

test("matches the pitch-training shell", async ({ page }) => {
  await page.goto("/");
  await openNavDrawerIfNeeded(page);
  await page.getByRole("link", { name: "Pitch training" }).click();
  await expect(page.getByLabel("Hidden pitch note")).toBeVisible();

  await expect(page).toHaveScreenshot("pitch-training-shell.png", {
    fullPage: true,
  });
});

test("matches the songs shell", async ({ page }) => {
  await page.goto("/");
  await openNavDrawerIfNeeded(page);
  await page.getByRole("link", { name: "Songs" }).click();
  await expect(page.getByRole("heading", { name: "Song library" })).toBeVisible();

  await expect(page).toHaveScreenshot("songs-shell.png", {
    fullPage: true,
  });
});

// Brand-colored controls are a small share of full-page pixels, so a palette
// change can slip under the page-level diff ratio. These element snapshots
// are dominated by brand fills: any re-theme flips most of their pixels.
test("matches the brand accent controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();

  await expect(page.locator(".primary-button")).toHaveScreenshot("brand-primary-button.png", {
    maxDiffPixelRatio: 0.02,
  });
  await openNavDrawerIfNeeded(page);
  await expect(page.locator(".sidebar a.active")).toHaveScreenshot("brand-nav-active.png", {
    maxDiffPixelRatio: 0.02,
  });
});
