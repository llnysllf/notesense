import { afterEach, describe, expect, it, vi } from "vitest";
import { drawShareCard, downloadShareCard } from "./shareCardImage";
import type { ShareCardContent } from "./types";

// jsdom has no 2d canvas context, so one is stood up here. What matters is not
// the pixels — it is that the card is drawn locally and that every line of the
// content reaches the canvas.
type DrawCall = { text: string; x: number; y: number };

function fakeCanvas(withContext = true) {
  const calls: DrawCall[] = [];
  const context = {
    fillStyle: "",
    font: "",
    fillRect: vi.fn(),
    fillText: (text: string, x: number, y: number) => calls.push({ text, x, y }),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => (withContext ? context : null),
    toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob(["png"], { type: "image/png" })),
  } as unknown as HTMLCanvasElement;

  return { canvas, calls, context };
}

const content: ShareCardContent = {
  title: "NoteSense Reading Score",
  scoreText: "68",
  qualifier: "Provisional — not a standardized score",
  subtitle: "Medium difficulty · on a piano",
  lines: [
    { label: "Notes", value: "90%" },
    { label: "Rhythm", value: "70%" },
    { label: "Continuity", value: "80%" },
    { label: "Fluency", value: "60%" },
  ],
  dateText: "2026-08-01",
  footnote: "notesense",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("share card image", () => {
  it("draws the score, its context, and every component", () => {
    const { canvas, calls } = fakeCanvas();

    expect(drawShareCard(canvas, content)).toBe(true);

    const drawn = calls.map((call) => call.text);
    expect(drawn).toContain("68");
    expect(drawn).toContain("NoteSense Reading Score");
    expect(drawn).toContain("Medium difficulty · on a piano");
    expect(drawn).toContain("2026-08-01");
    for (const line of content.lines) {
      expect(drawn).toContain(line.label);
      expect(drawn).toContain(line.value);
    }
  });

  it("carries the provisional caveat onto the image itself", () => {
    const { canvas, calls } = fakeCanvas();

    drawShareCard(canvas, content);

    expect(calls.map((call) => call.text)).toContain("Provisional — not a standardized score");
  });

  it("omits the caveat once there is nothing to caveat", () => {
    const { canvas, calls } = fakeCanvas();

    drawShareCard(canvas, { ...content, qualifier: "" });

    expect(calls.map((call) => call.text)).not.toContain("");
  });

  it("gives up quietly when there is no drawing context", () => {
    const { canvas } = fakeCanvas(false);

    expect(drawShareCard(canvas, content)).toBe(false);
  });

  it("hands the learner a local file and leaves no object URL behind", () => {
    const { canvas } = fakeCanvas();
    const createObjectURL = vi.fn(() => "blob:local");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadShareCard(canvas, "notesense-reading-score-2026-08-01.png");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    // Nothing is uploaded and nothing is retained: the URL is local and revoked.
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:local");
    vi.unstubAllGlobals();
  });

  it("does nothing when the canvas produces no image", () => {
    const canvas = {
      getContext: () => null,
      toBlob: (callback: (blob: Blob | null) => void) => callback(null),
    } as unknown as HTMLCanvasElement;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadShareCard(canvas, "card.png");

    expect(click).not.toHaveBeenCalled();
  });
});
