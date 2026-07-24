import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const ADVANCE_DELAY_MS = 650;

async function getCurrentReadingNoteId(page: Page) {
  const label = (await page.getByRole("img", { name: /staff note/i }).getAttribute("aria-label")) ?? "";
  const match = /note ([A-G]\d)/.exec(label);

  if (!match?.[1]) {
    throw new Error(`Could not read current staff note from "${label}".`);
  }

  return match[1];
}

// White keys are partially covered by the black keys above them, and the
// key's center can sit under that overlay once layouts narrow. Click the
// exposed lower part of the key instead.
async function clickPianoKey(key: Locator) {
  const box = await key.boundingBox();

  if (!box) {
    throw new Error("Piano key is not visible, so it cannot be clicked.");
  }

  await key.click({ position: { x: box.width / 2, y: box.height - 8 } });
}

async function clickCurrentReadingPianoKey(page: Page) {
  const noteId = await getCurrentReadingNoteId(page);
  await clickPianoKey(page.getByRole("button", { name: `White piano key ${noteId}` }));
}

function appNav(page: Page) {
  return page.getByRole("navigation", { name: "NoteSense sections" });
}

// On phone-sized viewports the sidebar is an off-canvas drawer, so nav
// buttons are reachable only after tapping the topbar menu button. Picking
// a destination closes the drawer again. Lookups stay scoped to the nav
// with exact names so labels like "Overview" cannot collide with other
// controls (the piano rail's accessible name also contains "overview").
async function openAppSection(page: Page, name: string) {
  const toggle = page.getByRole("button", { name: "Open menu" });
  if (await toggle.isVisible()) {
    await toggle.click();
  }
  await appNav(page).getByRole("button", { name, exact: true }).click();
}

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
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // The app opens on Today with the daily mix and goal.
  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Daily goal" })).toBeVisible();
  await expect(page.getByText("Weak spot")).toBeVisible();

  const menuToggle = page.getByRole("button", { name: "Open menu" });
  if (await menuToggle.isVisible()) {
    await menuToggle.click();
  }
  const nav = appNav(page);
  await expect(nav.getByRole("button", { name: "Today", exact: true })).toHaveAttribute("aria-pressed", "true");
  for (const label of [
    "Note reading",
    "Pitch training",
    "Songs",
    "Overview",
    "Map",
    "History",
    "Preferences",
    "Data",
  ]) {
    await expect(nav.getByRole("button", { name: label, exact: true })).toBeVisible();
  }

  const todayScan = await new AxeBuilder({ page }).analyze();
  expect(todayScan.violations).toEqual([]);

  // The nav is already open (mobile drawer) / visible (desktop), so navigate directly.
  await nav.getByRole("button", { name: "Note reading", exact: true }).click();
  await expect(page.getByRole("group", { name: "88-key piano keyboard" })).toBeVisible();
});

test("completes a Daily Mix drill segment from Today", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const weakSpot = page.locator(".daily-mix-card", { hasText: "Weak spot" });
  await expect(weakSpot).toBeVisible();
  await weakSpot.getByRole("button", { name: /^Start / }).click();

  // The segment lands on a configured practice drill.
  await page.getByRole("button", { name: "Start drill" }).click();
  await clickCurrentReadingPianoKey(page);
  await page.getByRole("button", { name: "Finish round" }).click();

  // Back on Today, the weak-spot segment is marked done.
  await openAppSection(page, "Today");
  await expect(page.locator(".daily-mix-card.complete", { hasText: "Weak spot" })).toBeVisible();
});

test("runs the note-reading practice loop", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await openAppSection(page, "Note reading");

  await expect(
    page.getByRole("button", { name: `White piano key ${await getCurrentReadingNoteId(page)}` }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(
    page.getByRole("button", { name: `White piano key ${await getCurrentReadingNoteId(page)}` }),
  ).toHaveAttribute("aria-disabled", "false");

  await clickCurrentReadingPianoKey(page);
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");

  await page.getByRole("button", { name: "Finish round" }).click();
  await openAppSection(page, "Overview");
  await expect(page.getByRole("heading", { name: "Last round" })).toBeVisible();
  await expect(page.getByText(/1\/1\s+round/)).toBeVisible();
  await expect(page.getByText("Goal complete. Keep the streak alive tomorrow.")).toBeVisible();
  await openAppSection(page, "History");
  await expect(page.getByRole("heading", { name: "Practice history" })).toBeVisible();
  await expect(page.getByRole("listitem", { name: /Note reading session/ })).toBeVisible();

  const postRoundAccessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(postRoundAccessibilityScanResults.violations).toEqual([]);

  await page.reload({ waitUntil: "domcontentloaded" });
  await openAppSection(page, "History");
  await expect(page.getByRole("listitem", { name: /Note reading session/ })).toBeVisible();
});

test("renders the right piano layout for the current viewport", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await openAppSection(page, "Note reading");

  await expect(page.getByRole("group", { name: "88-key piano keyboard" })).toBeVisible();

  const pianoLayout = await page.evaluate(() => {
    const panel = document.querySelector(".piano-keyboard-panel");
    const viewport = document.querySelector(".piano-keyboard-viewport");
    const buttons = Array.from(document.querySelectorAll(".piano-key"));
    const blackKeys = Array.from(document.querySelectorAll(".black-key"));
    const overviewKeys = Array.from(document.querySelectorAll("[data-piano-overview-key]"));
    const overviewTargets = Array.from(document.querySelectorAll(".piano-overview-key.overview-target"));
    const overviewWindowKeys = Array.from(document.querySelectorAll(".piano-overview-key.overview-window"));
    const viewportRect = viewport?.getBoundingClientRect();
    const visibleButtons = buttons.filter((button) => {
      const rect = button.getBoundingClientRect();

      return viewportRect !== undefined && rect.right > viewportRect.left && rect.left < viewportRect.right;
    });
    const blackKeyLefts = blackKeys.map((key) => Math.round(key.getBoundingClientRect().left));

    return {
      clientWidth: viewport?.clientWidth ?? 0,
      scrollWidth: viewport?.scrollWidth ?? 0,
      blackKeyCount: blackKeys.length,
      distributedBlackKeys: new Set(blackKeyLefts).size,
      firstBlackKeyLeft: blackKeyLefts.at(0) ?? 0,
      lastBlackKeyLeft: blackKeyLefts.at(-1) ?? 0,
      layout: panel?.getAttribute("data-layout"),
      overviewKeyCount: overviewKeys.length,
      overviewTargetCount: overviewTargets.length,
      overviewWindowKeyCount: overviewWindowKeys.length,
      totalButtons: buttons.length,
      visibleButtons: visibleButtons.length,
      windowCenterNoteId: document.querySelector(".piano-mobile-layout")?.getAttribute("data-window-center-note-id"),
    };
  });

  if (pianoLayout.layout === "mobile-window") {
    expect(pianoLayout.visibleButtons).toBe(pianoLayout.totalButtons);
    expect(pianoLayout.totalButtons).toBeGreaterThan(20);
    expect(pianoLayout.totalButtons).toBeLessThan(35);
    expect(pianoLayout.overviewKeyCount).toBe(88);
    expect(pianoLayout.overviewTargetCount).toBe(0);
    expect(pianoLayout.overviewWindowKeyCount).toBeGreaterThan(20);
    expect(pianoLayout.blackKeyCount).toBeGreaterThan(8);
    expect(pianoLayout.windowCenterNoteId).toBe("C4");
  } else {
    expect(pianoLayout.totalButtons).toBe(88);
    expect(pianoLayout.visibleButtons).toBe(88);
    expect(pianoLayout.overviewKeyCount).toBe(0);
    expect(pianoLayout.blackKeyCount).toBe(36);
    expect(pianoLayout.distributedBlackKeys).toBeGreaterThan(30);
  }
  expect(pianoLayout.lastBlackKeyLeft).toBeGreaterThan(pianoLayout.firstBlackKeyLeft);
  expect(pianoLayout.scrollWidth).toBeLessThanOrEqual(pianoLayout.clientWidth + 1);
});

test("moves the phone piano window without changing the hidden answer", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await openAppSection(page, "Note reading");

  const mobileLayout = page.locator(".piano-mobile-layout");
  if ((await page.locator(".piano-keyboard-panel").getAttribute("data-layout")) !== "mobile-window") {
    return;
  }

  await expect(mobileLayout).toHaveAttribute("data-window-center-note-id", "C4");
  await expect(page.locator(".piano-overview-key.overview-target")).toHaveCount(0);

  await page.getByRole("button", { name: "Move piano window right" }).click();
  await expect(mobileLayout).toHaveAttribute("data-window-center-note-id", "C5");

  await page.getByRole("button", { name: "Center piano window on C4" }).click();
  await expect(mobileLayout).toHaveAttribute("data-window-center-note-id", "C4");

  await page.getByRole("button", { name: "Move piano window on full 88-key overview" }).click();
  expect(await mobileLayout.getAttribute("data-window-center-note-id")).not.toBe("C4");
});

test("answers reading shortcuts and exact pitch keys", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Note reading");
  const roundTile = page.locator(".round-strip .stat-tile").filter({ hasText: "Round" });

  await page.getByRole("button", { name: "Start drill" }).click();
  await page.keyboard.press("1");
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");
  await expect(roundTile).toContainText("/1");

  await openAppSection(page, "Pitch training");
  await page.getByRole("button", { name: "Start drill" }).click();
  await clickPianoKey(page.getByRole("button", { name: "White piano key C4, inside selected range" }));
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");
  await expect(roundTile).toContainText("/1");
});

test("switches to bass clef reading practice", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Note reading");
  await page.getByRole("button", { exact: true, name: "Bass" }).click();
  await expect(page.getByText("Adaptive | Bass clef C3-G3")).toBeVisible();
  await expect(page.getByLabel(/Bass staff note [C-G]3/)).toBeVisible();

  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(
    page.getByRole("button", { name: `White piano key ${await getCurrentReadingNoteId(page)}` }),
  ).toHaveAttribute("aria-disabled", "false");

  await page.reload({ waitUntil: "domcontentloaded" });
  await openAppSection(page, "Note reading");
  await expect(page.getByRole("button", { exact: true, name: "Bass" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel(/Bass staff note [C-G]3/)).toBeVisible();
});

test("switches to a wider mixed reading drill range", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Note reading");
  await page.getByRole("button", { name: "Grand" }).click();

  await expect(page.getByRole("button", { name: "Grand" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Adaptive | Mixed clef C3-B4")).toBeVisible();
  await expect(page.getByLabel(/(?:Treble|Bass) staff note [A-G][34]/)).toBeVisible();
});

test("sets a custom reading drill range from piano keys", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Note reading");
  await page.getByRole("button", { name: "Custom" }).click();
  const customRangeCard = page.locator(".custom-range-card");

  await expect(customRangeCard.getByText("Custom C3-B4")).toBeVisible();
  await clickPianoKey(customRangeCard.getByRole("button", { name: /^White piano key G3/ }));
  await expect(customRangeCard.getByRole("button", { name: "Start G3" })).toHaveAttribute("aria-pressed", "false");
  await expect(customRangeCard.getByRole("button", { name: "End B4" })).toHaveAttribute("aria-pressed", "true");
  await clickPianoKey(customRangeCard.getByRole("button", { name: /^White piano key C4/ }));

  await expect(page.getByText("Adaptive | Custom G3-C4")).toBeVisible();
  await expect(customRangeCard.getByText("4 notes")).toBeVisible();

  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(page.getByLabel(/(?:Treble|Bass) staff note [GABC][34]/)).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await openAppSection(page, "Note reading");
  await expect(page.getByRole("button", { name: "Custom" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Adaptive | Custom G3-C4")).toBeVisible();
});

test("keeps the selected reading range after switching during feedback", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await openAppSection(page, "Note reading");

  await page.getByRole("button", { name: "Start drill" }).click();
  await clickCurrentReadingPianoKey(page);
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");

  await page.getByRole("button", { exact: true, name: "Bass" }).click();
  await page.waitForTimeout(ADVANCE_DELAY_MS + 150);

  await expect(page.getByText("Adaptive | Bass clef C3-G3")).toBeVisible();
  await expect(page.getByLabel(/Bass staff note [C-G]3/)).toBeVisible();
});

test("exports local practice data", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Data");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^notesense-progress-\d{4}-\d{2}-\d{2}\.json$/);
});

test("imports local practice data", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Data");
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
          customReadingRange: { startNoteId: "C3", endNoteId: "B4" },
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
  await openAppSection(page, "Preferences");
  await expect(page.getByRole("button", { exact: true, name: "Bass" })).toHaveAttribute("aria-pressed", "true");
  await openAppSection(page, "Note reading");
  await expect(page.getByText("Random | Bass clef C3-G3")).toBeVisible();
  await openAppSection(page, "Overview");
  await expect(progressPanel.getByRole("heading", { name: "Focus C3" })).toBeVisible();
  await expect(progressPanel.getByText("85% on C3")).toBeVisible();
  await openAppSection(page, "Map");
  await expect(progressPanel.getByRole("listitem", { name: "C3 Focus, 67% accuracy across 6 attempts" })).toBeVisible();
  await openAppSection(page, "History");
  await expect(progressPanel.getByRole("heading", { name: "Practice insight" })).toBeVisible();
  await expect(progressPanel.getByText("+20%")).toBeVisible();
  await expect(
    progressPanel.getByRole("img", {
      name: "Note reading accuracy trend across 3 saved rounds, latest 80 percent.",
    }),
  ).toBeVisible();
  await expect(
    progressPanel.getByRole("listitem", { name: "Note reading session 8 out of 10, 80% accuracy" }),
  ).toBeVisible();
  await openAppSection(page, "Preferences");
  await expect(page.getByRole("button", { name: "30s" })).toHaveAttribute("aria-pressed", "true");

  await page.reload({ waitUntil: "domcontentloaded" });
  await openAppSection(page, "Overview");
  await expect(progressPanel.getByText("12")).toBeVisible();
  await openAppSection(page, "Preferences");
  await expect(page.getByRole("button", { name: "30s" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { exact: true, name: "Bass" })).toHaveAttribute("aria-pressed", "true");
});

test("rejects invalid imported practice data", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Data");
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

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await openAppSection(page, "Note reading");
  await page.getByRole("button", { name: "Start drill" }).click();
  await clickCurrentReadingPianoKey(page);

  await expect(page.getByRole("status")).toHaveText("Progress is not being saved on this device right now.");
  const practiceHeaderHeight = await page
    .locator(".app-header-panel")
    .evaluate((header) => header.getBoundingClientRect().height);

  await openAppSection(page, "Data");
  await expect(page.getByRole("status")).toHaveText("Progress is not being saved on this device right now.");
  const dataHeaderHeight = await page
    .locator(".app-header-panel")
    .evaluate((header) => header.getBoundingClientRect().height);

  expect(dataHeaderHeight).toBeCloseTo(practiceHeaderHeight, 3);
});

test("runs the pitch-training practice loop", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Pitch training");
  await expect(page.getByLabel("Hidden pitch note")).toBeVisible();

  await page.getByRole("button", { name: "Start drill" }).click();
  const c4 = page.getByRole("button", { name: "White piano key C4, inside selected range" });
  await expect(c4).toHaveAttribute("aria-disabled", "false");

  await clickPianoKey(c4);
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");
});

test("writes a pitch sequence on the staff while it plays and submits it", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Pitch training");
  await page.getByRole("button", { name: "Pitch sequence" }).click();
  await expect(page.getByRole("img", { name: /Pitch sequence answer, 0 of 3 notes entered/ })).toBeVisible();
  await page.getByRole("button", { name: "Start drill" }).click();

  for (const [index, noteId] of ["C4", "C#4", "D4"].entries()) {
    await clickPianoKey(page.getByRole("button", { name: new RegExp(`piano key ${noteId}, inside selected range`) }));
    await expect(page.getByRole("img", { name: new RegExp(`${index + 1} of 3 notes entered`) })).toBeVisible();
  }

  await expect(page.getByText("3/3")).toBeVisible();
  await page.getByRole("button", { name: "Submit sequence" }).click();
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");
});

test("keeps the responsive layout inside the viewport", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);
});

test("plays a song from the library start to finish", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Songs");
  await expect(page.getByRole("heading", { name: "Song library" })).toBeVisible();

  const twinkleCard = page.locator(".song-card", { hasText: "Twinkle, Twinkle, Little Star" });
  await expect(twinkleCard.getByText(/Not played yet/)).toBeVisible();
  await twinkleCard.getByRole("button", { name: "Practice" }).click();

  await expect(page.getByRole("region", { name: "Song practice: Twinkle, Twinkle, Little Star" })).toBeVisible();
  await expect(page.getByText("Play: C4, quarter note")).toBeVisible();

  // A wrong key flags the sheet but does not advance.
  await clickPianoKey(page.getByRole("button", { name: "White piano key B4" }));
  await expect(page.locator(".sheet-event.current.wrong")).toBeVisible();
  await expect(page.getByText("1/14")).toBeVisible();

  const melody = ["C4", "C4", "G4", "G4", "A4", "A4", "G4", "F4", "F4", "E4", "E4", "D4", "D4", "C4"];
  for (const noteId of melody) {
    await clickPianoKey(page.getByRole("button", { name: `White piano key ${noteId}` }));
  }

  await expect(page.getByText(/Finished with \d+% accuracy\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();

  await page.getByRole("button", { name: "Back to songs" }).click();
  await expect(twinkleCard.getByText(/Best 9[0-9]% \| Completed 1x/)).toBeVisible();
});
