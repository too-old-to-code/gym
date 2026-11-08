// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Emom1 } from "../../src/workouts/Emom1";
import { workoutRegistry } from "../../src/workouts/registry";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const interval = (ms: number, status: "running" | "paused" = "running") => ({
  status,
  direction: "up" as const,
  totalMs: 0,
  ms,
  intervalMs: 60_000,
  receivedAt: Date.now(),
});
const rounds = (c: HTMLElement) => c.querySelector(".gd-rounds-count")?.textContent;

describe("Emom1", () => {
  test("shows the skill and the three movements in order", () => {
    const { container } = render(<Emom1 />);
    expect(screen.getByText("Slow toes to bar")).toBeTruthy();
    const rows = [...container.querySelectorAll(".gd-row")].map((r) => [
      r.querySelector(".gd-name")?.textContent,
      r.querySelector(".gd-score")?.textContent,
      r.querySelector(".gd-rx-label")?.textContent,
    ]);
    expect(rows).toEqual([
      ["Pull-ups", "5", "REPS"],
      ["Press-ups", "10", "REPS"],
      ["Squats", "15", "REPS"],
    ]);
  });

  test("before it starts the clock reads 1:00 and rounds read 0", () => {
    const { container } = render(<Emom1 />);
    expect(screen.getByText("1:00")).toBeTruthy();
    expect(rounds(container)).toBe("0");
  });

  test("counts down each second of the minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    render(<Emom1 timer={interval(0)} />);
    expect(screen.getByText("1:00")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("0:59")).toBeTruthy();
    act(() => vi.advanceTimersByTime(40_000));
    expect(screen.getByText("0:19")).toBeTruthy();
  });

  test("restarts at 1:00 each minute and adds one to the rounds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const { container } = render(<Emom1 timer={interval(0)} />);
    act(() => vi.advanceTimersByTime(59_000));
    expect(screen.getByText("0:01")).toBeTruthy();
    expect(rounds(container)).toBe("0");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("1:00")).toBeTruthy();
    expect(rounds(container)).toBe("1");
    act(() => vi.advanceTimersByTime(61_000));
    expect(screen.getByText("0:59")).toBeTruthy();
    expect(rounds(container)).toBe("2");
  });

  test("a screen that joins mid-session shows the minute and rounds so far", () => {
    const { container } = render(<Emom1 timer={interval(5 * 60_000 + 20_000, "paused")} />);
    expect(screen.getByText("0:40")).toBeTruthy();
    expect(rounds(container)).toBe("5");
  });

  test("the clock is never red", () => {
    const { container } = render(<Emom1 timer={interval(55_000)} />);
    expect((container.querySelector(".gd-timer") as HTMLElement).dataset.urgent).toBe("false");
  });

  test("is registered as emom-1", () => {
    expect(workoutRegistry["emom-1"]).toBe(Emom1);
  });
});
