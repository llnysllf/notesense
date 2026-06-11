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
