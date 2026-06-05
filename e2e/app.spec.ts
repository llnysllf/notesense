import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ADVANCE_DELAY_MS = 650;

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
  await expect(page.getByRole("heading", { name: "Build baseline" })).toBeVisible();
  await expect(page.getByText("5 more answers")).toBeVisible();

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

test("switches to bass clef reading practice", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Bass" }).click();
  await expect(page.getByText("Adaptive | Bass clef C3-G3")).toBeVisible();
  await expect(page.getByLabel(/Bass staff note [C-G]3/)).toBeVisible();

  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(page.getByRole("button", { name: "Answer C" })).toBeEnabled();

  await page.reload();
  await expect(page.getByRole("button", { name: "Bass" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel(/Bass staff note [C-G]3/)).toBeVisible();
});

test("keeps the selected reading range after switching during feedback", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start drill" }).click();
  await page.getByRole("button", { name: "Answer C" }).click();
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");

  await page.getByRole("button", { name: "Bass" }).click();
  await page.waitForTimeout(ADVANCE_DELAY_MS + 150);

  await expect(page.getByText("Adaptive | Bass clef C3-G3")).toBeVisible();
  await expect(page.getByLabel(/Bass staff note [C-G]3/)).toBeVisible();
});

test("exports local practice data", async ({ page }) => {
  await page.goto("/");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^notesense-progress-\d{4}-\d{2}-\d{2}\.json$/);
});

test("imports local practice data", async ({ page }) => {
  await page.goto("/");

  await page.locator('input[type="file"]').setInputFiles({
    name: "notesense-progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: "2026-06-05T10:00:00.000Z",
        progress: {
          reading: {
            totalAttempts: 12,
            totalCorrect: 9,
            bestRoundScore: 8,
            sessionsCompleted: 2,
            noteStats: {
              C3: { attempts: 6, correct: 4 },
            },
          },
          pitch: {
            totalAttempts: 3,
            totalCorrect: 1,
            bestRoundScore: 1,
            sessionsCompleted: 1,
            noteStats: {
              C4: { attempts: 3, correct: 1 },
            },
          },
          history: [
            {
              id: "imported-session",
              mode: "reading",
              completedAt: "2026-06-05T09:00:00.000Z",
              durationSeconds: 60,
              score: 8,
              attempts: 10,
              accuracy: 80,
              bestStreak: 4,
            },
            {
              id: "imported-session-previous",
              mode: "reading",
              completedAt: "2026-06-05T08:00:00.000Z",
              durationSeconds: 30,
              score: 3,
              attempts: 5,
              accuracy: 60,
              bestStreak: 2,
            },
            {
              id: "imported-session-old",
              mode: "reading",
              completedAt: "2026-06-05T07:00:00.000Z",
              durationSeconds: 30,
              score: 2,
              attempts: 5,
              accuracy: 40,
              bestStreak: 1,
            },
          ],
        },
        settings: {
          roundLength: 30,
          readingRange: "bass-starter",
          adaptivePractice: false,
          autoPlayPitch: true,
          revealPitchAfterAnswer: true,
        },
      }),
    ),
  });

  const progressPanel = page.getByLabel("Practice progress");
  await expect(progressPanel.getByRole("status")).toHaveText("Progress imported.");
  await expect(progressPanel.getByText("12")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bass" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Random | Bass clef C3-G3")).toBeVisible();
  await expect(progressPanel.getByRole("heading", { name: "Focus C3" })).toBeVisible();
  await expect(progressPanel.getByText("85% on C3")).toBeVisible();
  await expect(progressPanel.getByRole("heading", { name: "Practice insight" })).toBeVisible();
  await expect(progressPanel.getByText("+20%")).toBeVisible();
  await expect(
    progressPanel.getByRole("img", {
      name: "Note reading accuracy trend across 3 saved rounds, latest 80 percent.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "30s" })).toHaveAttribute("aria-pressed", "true");
  await expect(
    progressPanel.getByRole("listitem", { name: "Note reading session 8 out of 10, 80% accuracy" }),
  ).toBeVisible();

  await page.reload();
  await expect(progressPanel.getByText("12")).toBeVisible();
  await expect(page.getByRole("button", { name: "30s" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Bass" })).toHaveAttribute("aria-pressed", "true");
});

test("rejects invalid imported practice data", async ({ page }) => {
  await page.goto("/");

  await page.locator('input[type="file"]').setInputFiles({
    name: "broken-notesense-progress.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });

  await expect(page.getByRole("status")).toHaveText("Choose a valid NoteSense export file.");
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
