// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Amrap1 } from "../../src/workouts/Amrap1";
import { workoutRegistry } from "../../src/workouts/registry";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Amrap1", () => {
  test("shows the skill and the 20 minute AMRAP", () => {
    render(<Amrap1 />);
    expect(screen.getByText("Practise handstands")).toBeTruthy();
    expect(screen.getByText("20:00")).toBeTruthy();
    expect(screen.getByText("As many rounds as possible")).toBeTruthy();
  });

  test("lists the four movements in order with amounts", () => {
    const { container } = render(<Amrap1 />);
    const rows = [...container.querySelectorAll(".gd-row")].map((r) => [
      r.querySelector(".gd-name")?.textContent,
      r.querySelector(".gd-score")?.textContent,
      r.querySelector(".gd-rx-label")?.textContent,
    ]);
    expect(rows).toEqual([
      ["Row", "15", "CAL"],
      ["Kettlebell swings", "15", "REPS"],
      ["Ring rows", "10", "REPS"],
      ["Double-unders", "30", "REPS"],
    ]);
  });

  test("is registered as amrap-1", () => {
    expect(workoutRegistry["amrap-1"]).toBe(Amrap1);
  });

  test("counts down from the server's timer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const timer = { status: "running" as const, direction: "down" as const, totalMs: 20 * 60_000, ms: 20 * 60_000, receivedAt: 10_000 };
    render(<Amrap1 timer={timer} />);
    expect(screen.getByText("20:00")).toBeTruthy();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("19:55")).toBeTruthy();
  });

  test("shows 0:00 when time is up", () => {
    const timer = { status: "done" as const, direction: "down" as const, totalMs: 20 * 60_000, ms: 0, receivedAt: 0 };
    render(<Amrap1 timer={timer} />);
    expect(screen.getByText("0:00")).toBeTruthy();
  });

  const clockEl = (container: HTMLElement) => container.querySelector(".gd-timer") as HTMLElement;
  const at = (ms: number, status: "running" | "paused" | "done" = "running") => ({
    status,
    direction: "down" as const, totalMs: 20 * 60_000,
    ms,
    receivedAt: Date.now(),
  });

  test("the clock is not in a card", () => {
    const { container } = render(<Amrap1 />);
    expect(clockEl(container).closest(".gd-card")).toBeNull();
  });

  test("the clock is green until the last 30 seconds, then red", () => {
    const green = render(<Amrap1 timer={at(31_000)} />);
    expect(clockEl(green.container).dataset.urgent).toBe("false");
    cleanup();
    const red = render(<Amrap1 timer={at(30_000)} />);
    expect(clockEl(red.container).dataset.urgent).toBe("true");
  });

  test("it stays red when time is up, and is not red at the start", () => {
    const done = render(<Amrap1 timer={at(0, "done")} />);
    expect(clockEl(done.container).dataset.urgent).toBe("true");
    cleanup();
    const idle = render(<Amrap1 />);
    expect(clockEl(idle.container).dataset.urgent).toBe("false");
  });
});
