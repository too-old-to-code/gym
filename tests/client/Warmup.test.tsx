// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { WarmupA } from "../../src/workouts/WarmupA";
import { WarmupB } from "../../src/workouts/WarmupB";
import { workoutRegistry } from "../../src/workouts/registry";

afterEach(cleanup);

const rowsOf = (container: HTMLElement) =>
  [...container.querySelectorAll(".gd-row")].map((r) => [
    r.querySelector(".gd-name")?.textContent,
    r.querySelector(".gd-score")?.textContent,
    r.querySelector(".gd-rx-label")?.textContent,
  ]);

const SHARED = [
  ["Lunge", "30", "SEC EACH LEG"],
  ["Kneeling back", "30", "SEC"],
  ["Quad stretch", "30", "SEC EACH LEG"],
  ["Copenhagen", "30", "SEC EACH LEG"],
  ["Bird dog", "60", "SEC"],
  ["Kettlebell knee raise", "3 × 8", "EACH SIDE"],
];

describe("Warm-up A", () => {
  test("has its heading and the seven movements in order, ending with crab walks", () => {
    const { container } = render(<WarmupA />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Warm-up A");
    expect(rowsOf(container)).toEqual([...SHARED, ["Crab walks", "8", "EACH DIRECTION"]]);
  });

  test("bird dog says to alternate sides every 10 seconds", () => {
    const { container } = render(<WarmupA />);
    const bird = [...container.querySelectorAll(".gd-row")][4];
    expect(bird.querySelector(".gd-kit")?.textContent).toBe("Alternate sides every 10 secs");
  });

  test("has no clock and no skill card", () => {
    const { container } = render(<WarmupA />);
    expect(container.querySelector(".gd-timer")).toBeNull();
    expect(container.querySelector(".gd-skill")).toBeNull();
  });
});

describe("Warm-up B", () => {
  test("is the same except side leg raises replace the crab walks", () => {
    const { container } = render(<WarmupB />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Warm-up B");
    expect(rowsOf(container)).toEqual([...SHARED, ["Side leg raises", "8", "EACH SIDE"]]);
  });
});

describe("registry", () => {
  test("registers both warm-ups", () => {
    expect(workoutRegistry["warmup-a"]).toBe(WarmupA);
    expect(workoutRegistry["warmup-b"]).toBe(WarmupB);
  });
});
