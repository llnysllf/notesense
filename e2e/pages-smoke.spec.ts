import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function getCurrentReadingNoteId(page: Page) {
  const label = (await page.getByRole("img", { name: /staff note/i }).getAttribute("aria-label")) ?? "";
  const match = /note ([A-G]\d)/.exec(label);

  if (!match?.[1]) {
    throw new Error(`Could not read current staff note from "${label}".`);
  }

  return match[1];
}

test("serves the GitHub Pages build under the /notesense/ base path", async ({ page }) => {
  const failedRequests: string[] = [];
  const failedAssetResponses: string[] = [];
  const failedMetadataResponses: string[] = [];
  const metadataPaths = ["/notesense/icon.svg", "/notesense/site.webmanifest"];

  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "unknown error"}`);
  });

  page.on("response", (response) => {
    const url = response.url();

    if (url.includes("/notesense/assets/") && !response.ok()) {
      failedAssetResponses.push(`${response.status()} ${url}`);
    }

    if (metadataPaths.some((path) => url.includes(path)) && !response.ok()) {
      failedMetadataResponses.push(`${response.status()} ${url}`);
    }
  });

  page.on("pageerror", (error) => {
    throw error;
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      throw new Error(message.text());
    }
  });

  await page.goto("/notesense/");

  await expect(page).toHaveTitle("NoteSense | Piano Note Reading Trainer");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/notesense/site.webmanifest");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/notesense/icon.svg");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#1d1d1f");
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    "content",
    /connect-src 'none'/,
  );
  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start drill" })).toBeVisible();

  const manifestResponse = await page.request.get("/notesense/site.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()["content-type"]).toMatch(/json|manifest/);

  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(
    page.getByRole("button", { name: `White piano key ${await getCurrentReadingNoteId(page)}` }),
  ).toHaveAttribute("aria-disabled", "false");

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);

  expect(failedRequests).toEqual([]);
  expect(failedAssetResponses).toEqual([]);
  expect(failedMetadataResponses).toEqual([]);
});

test("loads nested routes through the Pages 404 shell and preserves them on reload", async ({ page }) => {
  const firstLoad = await page.goto("/notesense/progress/map", { waitUntil: "domcontentloaded" });

  // GitHub Pages correctly returns 404 for a deep path, but its 404.html is
  // our built shell and the router still renders the requested destination.
  expect(firstLoad?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Mastery map" })).toBeVisible();

  const reloaded = await page.reload({ waitUntil: "domcontentloaded" });
  expect(reloaded?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Mastery map" })).toBeVisible();
});

test("renders an in-app not-found screen for an unknown Pages destination", async ({ page }) => {
  const response = await page.goto("/notesense/progress/not-a-route", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "That destination does not exist" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to practice" })).toHaveAttribute(
    "href",
    "/notesense/practice/reading",
  );
});
