// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import rawConfig from "../../config/gym.config.json";
import type { Config } from "../../shared/config";
import { LIBRARY, libraryPages } from "../../src/workouts/library";
import { workoutRegistry } from "../../src/workouts/registry";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const config = rawConfig as Config;
const configured = config.users.flatMap((u) => u.categories.flatMap((c) => c.workouts));

describe("gym.config.json", () => {
  test("every configured workout has a page in the registry", () => {
    const missing = [...new Set(configured.map((w) => w.id))].filter((id) => !workoutRegistry[id]);
    expect(missing).toEqual([]);
  });

  test("every library workout is offered to Andrew", () => {
    const andrew = config.users.find((u) => u.id === "andrew")!;
    const ids = new Set(andrew.categories.flatMap((c) => c.workouts.map((w) => w.id)));
    expect(Object.keys(LIBRARY).filter((id) => !ids.has(id))).toEqual([]);
  });

  test("each library workout's server timer matches its page clock", () => {
    for (const [id, workout] of Object.entries(LIBRARY)) {
      const entry = configured.find((w) => w.id === id)!;
      const { clock } = workout;
      if (clock.kind === "amrap") expect(entry.timerMinutes, id).toBe(clock.minutes);
      if (clock.kind === "emom") expect(entry.intervalSeconds, id).toBe(60);
      if (clock.kind === "stopwatch") expect(entry.stopwatch, id).toBe(true);
    }
  });
});

describe("library pages", () => {
  test("each page shows its name and every movement in order", () => {
    for (const [id, workout] of Object.entries(LIBRARY)) {
      const Page = libraryPages[id];
      const { container, unmount } = render(<Page />);
      expect(screen.getByText(workout.heading), id).toBeTruthy();
      const shown = [...container.querySelectorAll(".gd-row .gd-name")].map((n) => n.textContent);
      const expected = workout.sections.flatMap((s) => s.moves.map((m) => m.name));
      expect(shown, id).toEqual(expected);
      unmount();
    }
  });

  test("an AMRAP counts down from its length", () => {
    const Page = libraryPages["amrap-floor-grinder"];
    render(<Page />);
    expect(screen.getByText("12:00")).toBeTruthy();
  });

  test("an EMOM shows a one-minute countdown and counts rounds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const timer = {
      status: "running" as const,
      direction: "up" as const,
      totalMs: 0,
      ms: 0,
      intervalMs: 60_000,
      receivedAt: 10_000,
    };
    const Page = libraryPages["emom-swing-row"];
    const { container } = render(<Page timer={timer} />);
    expect(screen.getByText("1:00")).toBeTruthy();
    act(() => vi.advanceTimersByTime(61_000));
    expect(container.querySelector(".gd-rounds-count")?.textContent?.trim()).toBe("1/16");
  });

  test("a stopwatch workout counts up from 0:00", () => {
    const Page = libraryPages["chipper-slow"];
    render(<Page />);
    expect(screen.getByText("0:00")).toBeTruthy();
  });

  test("a chipper draws an arrow from each movement into the next", () => {
    const Page = libraryPages["chipper-lunge"];
    const { container } = render(<Page />);
    expect(container.querySelectorAll(".gd-arrow-in")).toHaveLength(5);
  });
});

describe("EMOM length and current minute", () => {
  const atMs = (ms: number) => ({
    status: "paused" as const,
    direction: "up" as const,
    totalMs: 0,
    ms,
    intervalMs: 60_000,
    receivedAt: Date.now(),
  });
  const min = (n: number, extraSec = 0) => n * 60_000 + extraSec * 1000;
  const active = (c: HTMLElement) =>
    [...c.querySelectorAll(".gd-group")]
      .filter((g) => (g as HTMLElement).dataset.active === "true")
      .map((g) => g.querySelector(".gd-group-title")?.firstChild?.textContent);
  const count = (c: HTMLElement) => c.querySelector(".gd-rounds-count")?.textContent?.trim();

  test("before the start it reads 0 of the total and the first block is current", () => {
    const Page = libraryPages["emom-swing-row"];
    const { container } = render(<Page timer={atMs(0)} />);
    expect(count(container)).toBe("0/16");
    expect(active(container)).toEqual(["Odd minutes"]);
  });

  test("odd and even minutes take turns being current", () => {
    const Page = libraryPages["emom-box-burpee"];
    const { container, rerender } = render(<Page timer={atMs(min(3, 10))} />);
    expect(count(container)).toBe("3/20");
    expect(active(container)).toEqual(["Even minutes"]);
    rerender(<Page timer={atMs(min(4, 10))} />);
    expect(active(container)).toEqual(["Odd minutes"]);
  });

  test("a three-minute rotation walks through its stations", () => {
    const Page = libraryPages["emom-hang-hinge"];
    const { container, rerender } = render(<Page timer={atMs(min(2, 5))} />);
    expect(active(container)).toEqual(["Minute 3"]);
    rerender(<Page timer={atMs(min(3, 5))} />);
    expect(active(container)).toEqual(["Minute 1"]);
    rerender(<Page timer={atMs(min(17, 59))} />);
    expect(active(container)).toEqual(["Minute 3"]);
  });

  test("the clock reads Done once the last minute is over, and no block is current", () => {
    for (const [id, total] of [["emom-swing-row", 16], ["emom-box-burpee", 20], ["emom-hang-hinge", 18], ["emom-rope-swing", 16]] as const) {
      const Page = libraryPages[id];
      const { container, unmount } = render(<Page timer={atMs(min(total + 2))} />);
      expect(container.querySelector(".gd-timer-clock")?.textContent, id).toBe("Done");
      expect(count(container), id).toBe(`${total}/${total}`);
      expect(active(container), id).toEqual([]);
      unmount();
    }
  });

  test("the last minute still counts down", () => {
    const Page = libraryPages["emom-swing-row"];
    const { container } = render(<Page timer={atMs(min(15, 20))} />);
    expect(container.querySelector(".gd-timer-clock")?.textContent).toBe("0:40");
    expect(count(container)).toBe("15/16");
  });
});
