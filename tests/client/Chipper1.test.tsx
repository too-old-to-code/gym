// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Chipper1 } from "../../src/workouts/Chipper1";
import { workoutRegistry } from "../../src/workouts/registry";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Chipper1", () => {
  test("shows the skill and the heading", () => {
    render(<Chipper1 />);
    expect(screen.getByText("Bulgarian split squat")).toBeTruthy();
    expect(screen.getByText("Chipper")).toBeTruthy();
  });

  test("lists the five movements in order, biggest first", () => {
    const { container } = render(<Chipper1 />);
    const rows = [...container.querySelectorAll(".gd-row")].map((r) => [
      r.querySelector(".gd-name")?.textContent,
      r.querySelector(".gd-score")?.textContent,
      r.querySelector(".gd-rx-label")?.textContent,
    ]);
    expect(rows).toEqual([
      ["Row", "50", "CAL"],
      ["Walking lunges", "40", "REPS"],
      ["Kettlebell swings", "30", "REPS"],
      ["Ring dips", "20", "REPS"],
      ["Sandbag cleans", "10", "REPS"],
    ]);
  });

  test("a down arrow leads from each movement into the next", () => {
    const { container } = render(<Chipper1 />);
    const rows = [...container.querySelectorAll(".gd-row")];
    expect(rows[0].querySelector(".gd-arrow-in")).toBeNull();
    for (const row of rows.slice(1)) expect(row.querySelector(".gd-arrow-in")).not.toBeNull();
    expect(container.querySelectorAll(".gd-arrow-in")).toHaveLength(4);
  });

  test("an up arrow says to go back up afterwards", () => {
    const { container } = render(<Chipper1 />);
    const banner = container.querySelector(".gd-banner") as HTMLElement;
    expect(banner.textContent).toContain("Then back up");
    expect(banner.querySelector(".gd-banner-arrow-up")).not.toBeNull();
  });

  test("the clock counts up from 0:00", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const timer = { status: "running" as const, direction: "up" as const, totalMs: 0, ms: 0, receivedAt: 10_000 };
    render(<Chipper1 timer={timer} />);
    expect(screen.getByText("0:00")).toBeTruthy();
    act(() => vi.advanceTimersByTime(65_000));
    expect(screen.getByText("1:05")).toBeTruthy();
  });

  test("is registered as chipper-1", () => {
    expect(workoutRegistry["chipper-1"]).toBe(Chipper1);
  });
});
