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
  await appNav(page).getByRole("link", { name, exact: true }).click();
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

test("opens on Today with a plan the learner can finish", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // The app home is the plan, not a raw drill.
  await expect(page).toHaveURL(/\/today$|\/$/);
  await expect(page.getByRole("heading", { name: "Your plan for today" })).toBeVisible();

  const startLinks = page.getByRole("link", { name: "Start" });
  await expect(startLinks.first()).toBeVisible();
  await expect(page.getByText(/0 of \d+ done/)).toBeVisible();

  // Opening a block is not progress: it must still read as unfinished.
  await startLinks.first().click();
  await openAppSection(page, "Today");
  await expect(page.getByText(/0 of \d+ done/)).toBeVisible();
});

test("loads with no automated accessibility violations", async ({ page }) => {
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "NoteSense" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start drill" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Daily goal" })).not.toBeVisible();

  // Note reading is the active sidebar destination on first load, with the
  // other activities and views listed alongside it.
  const menuToggle = page.getByRole("button", { name: "Open menu" });
  if (await menuToggle.isVisible()) {
    await menuToggle.click();
  }
  const nav = appNav(page);
  await expect(nav.getByRole("link", { name: "Note reading" })).toHaveAttribute("aria-current", "page");
  for (const label of ["Pitch training", "Songs", "Overview", "Map", "History", "Preferences", "Data"]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await nav.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Daily goal" })).toBeVisible();
  await expect(page.getByText(/0\/1\s+round/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build baseline" })).toBeVisible();
  await expect(page.getByText("5 more answers")).toBeVisible();
  await openAppSection(page, "Map");
  await expect(page.getByRole("heading", { name: "Mastery map" })).toBeVisible();
  await expect(page.getByRole("listitem", { name: "C4 New, no attempts yet" })).toBeVisible();
  await openAppSection(page, "Note reading");
  await expect(page.getByRole("group", { name: "88-key piano keyboard" })).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test("runs the note-reading practice loop", async ({ page }) => {
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

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
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

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
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

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
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

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
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { exact: true, name: "Bass" }).click();
  await expect(page.getByText("Adaptive | Bass clef C3-G3")).toBeVisible();
  await expect(page.getByLabel(/Bass staff note [C-G]3/)).toBeVisible();

  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(
    page.getByRole("button", { name: `White piano key ${await getCurrentReadingNoteId(page)}` }),
  ).toHaveAttribute("aria-disabled", "false");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { exact: true, name: "Bass" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel(/Bass staff note [C-G]3/)).toBeVisible();
});

test("switches to a wider mixed reading drill range", async ({ page }) => {
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Grand" }).click();

  await expect(page.getByRole("button", { name: "Grand" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Adaptive | Mixed clef C3-B4")).toBeVisible();
  await expect(page.getByLabel(/(?:Treble|Bass) staff note [A-G][34]/)).toBeVisible();
});

test("sets a custom reading drill range from piano keys", async ({ page }) => {
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Custom", exact: true }).click();
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
  await expect(page.getByRole("button", { name: "Custom", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Adaptive | Custom G3-C4")).toBeVisible();
});

test("keeps the selected reading range after switching during feedback", async ({ page }) => {
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Start drill" }).click();
  await clickCurrentReadingPianoKey(page);
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");

  await page.getByRole("button", { exact: true, name: "Bass" }).click();
  await page.waitForTimeout(ADVANCE_DELAY_MS + 150);

  await expect(page.getByText("Adaptive | Bass clef C3-G3")).toBeVisible();
  await expect(page.getByLabel(/Bass staff note [C-G]3/)).toBeVisible();
});

test("exports local practice data", async ({ page }) => {
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Data");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^notesense-progress-\d{4}-\d{2}-\d{2}\.json$/);
});

test("imports local practice data", async ({ page }) => {
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

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
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

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

  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });
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
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

  await openAppSection(page, "Pitch training");
  await expect(page.getByLabel("Hidden pitch note")).toBeVisible();

  await page.getByRole("button", { name: "Start drill" }).click();
  const c4 = page.getByRole("button", { name: "White piano key C4, inside selected range" });
  await expect(c4).toHaveAttribute("aria-disabled", "false");

  await clickPianoKey(c4);
  await expect(page.getByTestId("practice-feedback")).not.toHaveText("Listening");
});

test("writes a pitch sequence on the staff while it plays and submits it", async ({ page }) => {
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

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
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);
});

test("plays a song from the library start to finish", async ({ page }) => {
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });

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

test("takes a placement check and starts a Reading Score", async ({ page }) => {
  await page.goto("/assess/placement", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Where should you start?" })).toBeVisible();
  // The check must read as optional, not as an entrance exam.
  await expect(page.getByText(/you can skip it/i)).toBeVisible();
  await expect(page.getByText("Question 1")).toBeVisible();

  // Answering moves it along, whatever the answer is.
  await clickPianoKey(page.getByRole("button", { name: "White piano key C4" }));
  await expect(page.getByText("Question 2")).toBeVisible();

  await openAppSection(page, "Reading Score");
  await expect(page.getByRole("heading", { name: "Reading Score" })).toBeVisible();
  await expect(page.getByText(/have not seen before/i)).toBeVisible();

  // Nothing is answerable until the count-in has finished.
  await expect(page.getByRole("button", { name: "White piano key C4" })).toHaveAttribute("aria-disabled", "true");

  await page.getByRole("button", { name: "Start the assessment" }).click();
  await expect(page.getByRole("button", { name: "Stop here" })).toBeVisible();

  // Stopping early still produces a result, and says why it was not recorded.
  await page.getByRole("button", { name: "Stop here" }).click();
  await expect(page.getByRole("heading", { name: "Your Reading Score" })).toBeVisible();
  await expect(page.getByText(/not a standardized measure/i)).toBeVisible();
  await expect(page.getByText(/not been added to your history/i)).toBeVisible();
});

test("names an interval by ear and writes down a phrase", async ({ page }) => {
  await page.goto("/practice/ear", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Ear training" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("3 replays left.");

  // Named answers: every option in the family is offered.
  const options = page.getByRole("group", { name: "Answer options" }).getByRole("button");
  await expect(options).toHaveCount(13);

  await page.getByRole("button", { name: "Perfect 5th" }).click();
  // Whatever the verdict, the right answer is named in text, not only coloured.
  await expect(page.getByRole("button", { name: /correct answer$/ })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // The written family gets an editor that works without a mouse.
  await page.getByLabel("Exercise").selectOption("ear.transcription");
  await expect(page.getByRole("group", { name: "Where each note goes" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Empty staff/ })).toBeVisible();

  await clickPianoKey(page.getByRole("button", { name: "White piano key C4" }));
  await expect(page.getByRole("img", { name: /Your transcription: C4/ })).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("img", { name: /Empty staff/ })).toBeVisible();
});

test("explains what happens to the microphone before recording anything", async ({ page }) => {
  await page.goto("/practice/singing", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Singing" })).toBeVisible();

  // The promise is made before the ask, not buried in settings.
  const privacy = page.getByText(/No audio is recorded, saved, or sent anywhere/);
  await expect(privacy).toBeVisible();
  await expect(privacy).toContainText("only while you are singing");

  // Nothing is listening until the learner says so.
  await expect(page.getByRole("meter", { name: "Microphone input level" })).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByRole("button", { name: "Sing it" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hear the starting note" })).toBeVisible();

  // The phrase is described in text, not drawn as a waveform.
  await expect(page.getByRole("img", { name: /Phrase to sing:/ })).toBeVisible();
});

test("offers MIDI import and says the file stays on the device", async ({ page }) => {
  await page.goto("/practice/import", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Import a MIDI file" })).toBeVisible();

  // Said before a file is chosen, not after.
  const note = page.getByRole("note");
  await expect(note).toContainText("Nothing is uploaded");
  await expect(note).toContainText("right to use");

  await expect(page.getByRole("button", { name: "Choose a MIDI file" })).toBeVisible();
  // Nothing to preview or save until a file is actually loaded.
  await expect(page.getByRole("button", { name: "Save to my songs" })).toHaveCount(0);
});

test("keeps the chosen sound world, and shows what each one costs", async ({ page }) => {
  await page.goto("/practice/reading", { waitUntil: "domcontentloaded" });
  await openAppSection(page, "Preferences");

  const worlds = page.getByRole("list", { name: "Sound world" });
  await expect(worlds).toBeVisible();

  // Size and licence are stated for every world, so "free" is something the
  // learner can read rather than assume.
  await expect(worlds.getByText(/No download/).first()).toBeVisible();
  await expect(worlds.getByText(/public-domain/).first()).toBeVisible();

  await worlds.getByRole("button", { name: /^Warm/ }).click();
  await expect(worlds.getByRole("button", { name: /^Warm/ })).toHaveAttribute("aria-pressed", "true");

  // The choice survives a reload, because it is a setting and not a session mood.
  await page.reload({ waitUntil: "domcontentloaded" });
  await openAppSection(page, "Preferences");
  await expect(worlds.getByRole("button", { name: /^Warm/ })).toHaveAttribute("aria-pressed", "true");
});
