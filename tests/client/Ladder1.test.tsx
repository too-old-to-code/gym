// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Ladder1 } from "../../src/workouts/Ladder1";
import { workoutRegistry } from "../../src/workouts/registry";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const stopwatch = (ms: number) => ({ status: "running" as const, direction: "up" as const, totalMs: 0, ms, receivedAt: Date.now() });

describe("Ladder1", () => {
  test("shows the skill", () => {
    render(<Ladder1 />);
    expect(screen.getByText("Overhead squat")).toBeTruthy();
  });

  test("groups the three ladder movements under one 21-15-9 heading, written once", () => {
    const { container } = render(<Ladder1 />);
    expect(screen.getAllByText("21-15-9").length).toBe(1);
    const group = container.querySelector(".gd-group") as HTMLElement;
    expect(group.querySelector(".gd-group-title")?.textContent).toContain("21-15-9");
    expect([...group.querySelectorAll(".gd-name")].map((n) => n.textContent)).toEqual([
      "Kettlebell swings",
      "Pull-ups",
      "Box burpees",
    ]);
    expect(group.querySelector(".gd-score")).toBeNull();
  });

  test("the steady finish is its own block after the group", () => {
    const { container } = render(<Ladder1 />);
    const blocks = [...container.querySelectorAll(".gd-moves")];
    expect(blocks).toHaveLength(2);
    const last = blocks[1];
    expect(last.querySelector(".gd-name")?.textContent).toBe("Rower / bike");
    expect(last.querySelector(".gd-score")?.textContent).toBe("10");
    expect(last.querySelector(".gd-rx-label")?.textContent).toBe("MIN STEADY");
  });

  test("the clock counts up from 0:00 and never goes red", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const { container } = render(<Ladder1 timer={stopwatch(0)} />);
    expect(screen.getByText("0:00")).toBeTruthy();
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByText("0:07")).toBeTruthy();
    expect((container.querySelector(".gd-timer") as HTMLElement).dataset.urgent).toBe("false");
  });

  test("shows 0:00 before the server has sent a timer", () => {
    render(<Ladder1 />);
    expect(screen.getByText("0:00")).toBeTruthy();
  });

  test("is registered as ladder-1", () => {
    expect(workoutRegistry["ladder-1"]).toBe(Ladder1);
  });
});
