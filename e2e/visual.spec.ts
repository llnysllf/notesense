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

test("matches the public home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Try one now" })).toBeVisible();

  await expect(page).toHaveScreenshot("public-home.png", {
    fullPage: true,
    // The demo draws a real prompt, and a real prompt is a different note every
    // time. Masking the staff keeps the page's layout under test without
    // pretending the drill is deterministic.
    mask: [page.locator(".demo svg")],
  });
});

test("matches the today shell", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Your plan for today" })).toBeVisible();

  await expect(page).toHaveScreenshot("today-shell.png", {
    fullPage: true,
  });
});

test("matches the note-reading shell", async ({ page }) => {
  await page.goto("/practice/reading");
  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start drill" })).toBeVisible();

  await expect(page).toHaveScreenshot("note-reading-shell.png", {
    fullPage: true,
  });
});

test("matches the pitch-training shell", async ({ page }) => {
  await page.goto("/practice/pitch");
  await expect(page.getByLabel("Hidden pitch note")).toBeVisible();

  await expect(page).toHaveScreenshot("pitch-training-shell.png", {
    fullPage: true,
  });
});

test("matches the songs shell", async ({ page }) => {
  await page.goto("/practice/songs");
  await expect(page.getByRole("heading", { name: "Song library" })).toBeVisible();

  await expect(page).toHaveScreenshot("songs-shell.png", {
    fullPage: true,
  });
});

// Brand-colored controls are a small share of full-page pixels, so a palette
// change can slip under the page-level diff ratio. These element snapshots
// are dominated by brand fills: any re-theme flips most of their pixels.
test("matches the brand accent controls", async ({ page }) => {
  await page.goto("/practice/reading");
  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();

  await expect(page.locator(".primary-button")).toHaveScreenshot("brand-primary-button.png", {
    maxDiffPixelRatio: 0.02,
  });
  await openNavDrawerIfNeeded(page);
  await expect(page.locator(".sidebar a.active")).toHaveScreenshot("brand-nav-active.png", {
    maxDiffPixelRatio: 0.02,
  });
});
