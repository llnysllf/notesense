import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDailyPlan } from "./useDailyPlan";
import { localDateKey } from "../types";

const PLAN_KEY = "notesense.dailyPlan.v1";

function PlanProbe() {
  const { plan, progress, openBlock, completeActivity, regenerate } = useDailyPlan();
  const first = plan.blocks[0];
  return (
    <div>
      <span data-testid="date">{plan.localDate}</span>
      <span data-testid="completed">{progress.completed}</span>
      <span data-testid="total">{progress.total}</span>
      <span data-testid="active">{plan.activeBlockId ?? "none"}</span>
      <button type="button" onClick={() => first && openBlock(first.id)}>
        open first
      </button>
      <button type="button" onClick={() => first && completeActivity(first.activity)}>
        finish first activity
      </button>
      <button type="button" onClick={() => completeActivity("songs")}>
        finish songs
      </button>
      <button type="button" onClick={regenerate}>
        regenerate
      </button>
    </div>
  );
}

const readStored = () => JSON.parse(window.localStorage.getItem(PLAN_KEY) ?? "null");

beforeEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => vi.useRealTimers());

describe("useDailyPlan", () => {
  it("generates and persists today's plan on first use", () => {
    render(<PlanProbe />);

    expect(screen.getByTestId("date")).toHaveTextContent(localDateKey(new Date()));
    expect(Number(screen.getByTestId("total").textContent)).toBeGreaterThan(0);
    expect(readStored().localDate).toBe(localDateKey(new Date()));
  });

  it("reuses a stored plan from the same day instead of regenerating", () => {
    const first = render(<PlanProbe />);
    const stored = readStored();
    first.unmount();

    render(<PlanProbe />);
    expect(readStored().generatedAtIso).toBe(stored.generatedAtIso);
  });

  it("replaces a plan left over from a previous day", () => {
    render(<PlanProbe />);
    const stale = { ...readStored(), localDate: "2020-01-01" };
    window.localStorage.setItem(PLAN_KEY, JSON.stringify(stale));

    render(<PlanProbe />);
    expect(readStored().localDate).toBe(localDateKey(new Date()));
  });

  it("only credits a block once its own activity finishes", () => {
    render(<PlanProbe />);

    act(() => screen.getByRole("button", { name: "open first" }).click());
    expect(screen.getByTestId("active")).not.toHaveTextContent("none");
    // Opening a block is not progress.
    expect(screen.getByTestId("completed")).toHaveTextContent("0");

    act(() => screen.getByRole("button", { name: "finish first activity" }).click());
    expect(screen.getByTestId("completed")).toHaveTextContent("1");
    expect(screen.getByTestId("active")).toHaveTextContent("none");
    expect(readStored().completedBlockIds).toHaveLength(1);
  });

  it("does not credit anything when an unrelated activity finishes", () => {
    render(<PlanProbe />);

    // Nothing opened yet: finishing a drill on your own must not tick a block.
    act(() => screen.getByRole("button", { name: "finish songs" }).click());
    expect(screen.getByTestId("completed")).toHaveTextContent("0");
  });

  it("regenerates on request", () => {
    render(<PlanProbe />);
    act(() => screen.getByRole("button", { name: "open first" }).click());
    act(() => screen.getByRole("button", { name: "finish first activity" }).click());
    expect(screen.getByTestId("completed")).toHaveTextContent("1");

    act(() => screen.getByRole("button", { name: "regenerate" }).click());
    expect(screen.getByTestId("completed")).toHaveTextContent("0");
  });

  it("refreshes a stale plan when the app regains focus", () => {
    render(<PlanProbe />);
    const stale = { ...readStored(), localDate: "2020-01-01" };
    window.localStorage.setItem(PLAN_KEY, JSON.stringify(stale));

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(screen.getByTestId("date")).toHaveTextContent(localDateKey(new Date()));
  });

  it("survives a corrupted stored plan", () => {
    window.localStorage.setItem(PLAN_KEY, "{ not json");

    render(<PlanProbe />);
    expect(Number(screen.getByTestId("total").textContent)).toBeGreaterThan(0);
  });
});
