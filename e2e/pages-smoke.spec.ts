import { expect, test } from "@playwright/test";

test("serves the GitHub Pages build under the /notesense/ base path", async ({ page }) => {
  const failedRequests: string[] = [];
  const failedAssetResponses: string[] = [];

  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "unknown error"}`);
  });

  page.on("response", (response) => {
    const url = response.url();

    if (url.includes("/notesense/assets/") && !response.ok()) {
      failedAssetResponses.push(`${response.status()} ${url}`);
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
  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start drill" })).toBeVisible();

  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(page.getByRole("button", { name: "Answer C" })).toBeEnabled();

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);

  expect(failedRequests).toEqual([]);
  expect(failedAssetResponses).toEqual([]);
});
