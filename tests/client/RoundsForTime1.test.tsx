// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { RoundsForTime1 } from "../../src/workouts/RoundsForTime1";
import { workoutRegistry } from "../../src/workouts/registry";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const stopwatch = (ms: number, status: "running" | "paused" = "running") => ({
  status,
  direction: "up" as const,
  totalMs: 0,
  ms,
  receivedAt: Date.now(),
});

describe("RoundsForTime1", () => {
  test("shows the skill and the five rounds", () => {
    render(<RoundsForTime1 />);
    expect(screen.getByText("Work on cleans")).toBeTruthy();
    expect(screen.getByText("5 rounds for time")).toBeTruthy();
  });

  test("lists the three movements in order with amounts", () => {
    const { container } = render(<RoundsForTime1 />);
    const rows = [...container.querySelectorAll(".gd-row")].map((r) => [
      r.querySelector(".gd-name")?.textContent,
      r.querySelector(".gd-score")?.textContent,
      r.querySelector(".gd-rx-label")?.textContent,
    ]);
    expect(rows).toEqual([
      ["Row", "400", "M"],
      ["Thrusters", "12", "REPS"],
      ["Box burpees", "8", "REPS"],
    ]);
  });

  test("the clock reads 0:00 before it starts", () => {
    render(<RoundsForTime1 />);
    expect(screen.getByText("0:00")).toBeTruthy();
  });

  test("counts up from the server's stopwatch", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    render(<RoundsForTime1 timer={stopwatch(0)} />);
    expect(screen.getByText("0:00")).toBeTruthy();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("0:05")).toBeTruthy();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText("1:05")).toBeTruthy();
  });

  test("a paused stopwatch holds its time", () => {
    vi.useFakeTimers();
    render(<RoundsForTime1 timer={stopwatch(83_000, "paused")} />);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText("1:23")).toBeTruthy();
  });

  test("the clock is never red, however little or much time has passed", () => {
    const { container } = render(<RoundsForTime1 timer={stopwatch(10_000)} />);
    expect((container.querySelector(".gd-timer") as HTMLElement).dataset.urgent).toBe("false");
  });

  test("is registered as rft-1", () => {
    expect(workoutRegistry["rft-1"]).toBe(RoundsForTime1);
  });
});
