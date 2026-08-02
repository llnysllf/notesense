// Drawing the share card.
//
// Everything happens on a canvas in this tab: nothing is uploaded, no image
// service is called, and the file never leaves the device unless the learner
// chooses to share it themselves. That is why the card can carry a result at
// all — a "share" that quietly posted somewhere would be a different feature
// with a different consent question.

import type { ShareCardContent } from "./types";

const WIDTH = 1200;
const HEIGHT = 630;

// Read from the stylesheet rather than hardcoded, so a shared card looks like
// the app it came from and does not drift when the palette changes.
function themeColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

export function drawShareCard(canvas: HTMLCanvasElement, content: ShareCardContent): boolean {
  const context = canvas.getContext("2d");
  if (!context) return false;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const background = themeColor("--surface", "#12141c");
  const ink = themeColor("--text", "#f4f5fb");
  const muted = themeColor("--text-muted", "#a6acc4");
  const accent = themeColor("--accent", "#7c9cff");

  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = muted;
  context.font = "600 34px system-ui, sans-serif";
  context.fillText(content.title, 80, 120);

  context.fillStyle = accent;
  context.font = "700 200px system-ui, sans-serif";
  context.fillText(content.scoreText, 80, 320);

  context.fillStyle = ink;
  context.font = "400 36px system-ui, sans-serif";
  context.fillText(content.subtitle, 80, 380);

  context.fillStyle = muted;
  context.font = "400 30px system-ui, sans-serif";
  context.fillText(content.dateText, 80, 430);

  content.lines.forEach((line, index) => {
    const x = 640;
    const y = 200 + index * 62;
    context.fillStyle = muted;
    context.fillText(line.label, x, y);
    context.fillStyle = ink;
    context.font = "600 30px system-ui, sans-serif";
    context.fillText(line.value, x + 300, y);
    context.font = "400 30px system-ui, sans-serif";
  });

  if (content.qualifier.length > 0) {
    context.fillStyle = muted;
    context.font = "400 26px system-ui, sans-serif";
    context.fillText(content.qualifier, 80, HEIGHT - 70);
  }

  context.fillStyle = accent;
  context.font = "600 26px system-ui, sans-serif";
  context.fillText(content.footnote, WIDTH - 200, HEIGHT - 70);

  return true;
}

// Hands the learner the file. A local object URL, revoked immediately after the
// click, so nothing is left behind in the tab.
export function downloadShareCard(canvas: HTMLCanvasElement, fileName: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
