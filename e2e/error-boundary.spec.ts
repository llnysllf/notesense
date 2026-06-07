import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("shows an accessible recovery screen when rendering fails", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("notesense.forceRenderError", "true");
  });

  await page.goto("/");

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
  await expect(page.getByText("Recovery mode")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload NoteSense" })).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
