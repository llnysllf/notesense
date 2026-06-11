import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const HOST = "127.0.0.1";
const PORT = 4180;
const BASE_URL = `http://${HOST}:${PORT}/`;
const OUTPUT_DIR = "docs/media";
const SCHEMES = ["light", "dark"];

async function gotoWithRetry(page, url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "networkidle" });
      return;
    } catch {
      await delay(500);
    }
  }

  throw new Error(`Preview server never became reachable at ${url}`);
}

async function capture() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  try {
    for (const scheme of SCHEMES) {
      const context = await browser.newContext({
        colorScheme: scheme,
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();

      await gotoWithRetry(page, BASE_URL);
      await page.getByRole("heading", { name: "NoteSense" }).waitFor();
      await page.screenshot({ path: `${OUTPUT_DIR}/notesense-${scheme}.png`, fullPage: true });
      await context.close();

      console.log(`Captured ${scheme} screenshot`);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const preview = spawn("npm", ["run", "preview", "--", "--host", HOST, "--port", String(PORT), "--strictPort"], {
    stdio: "ignore",
  });

  try {
    await capture();
  } finally {
    preview.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
