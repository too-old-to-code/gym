// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { StrengthA } from "../../src/workouts/StrengthA";
import { workoutRegistry } from "../../src/workouts/registry";

afterEach(cleanup);

const COPY = [
  "Day 1 · Strength",
  "Strength A",
  "Five lifts, top to bottom. Finish all sets of one before the next.",
  "Warm-up",
  "Easy row or bike",
  "then hip openers",
  "100 min",
  "including warm-up",
  "Set the squat box where the hip is happy",
  "Squat to box",
  "Barbell · box at a hip-happy height",
  "Bench press",
  "Barbell · flat bench",
  "Pull-ups",
  "Bodyweight",
  "Hip thrusts",
  "Barbell · bench",
  "Back extensions",
  "Weighted · Roman chair",
];

describe("StrengthA", () => {
  test.each(COPY)("shows %s", (text) => {
    render(<StrengthA />);
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  });

  test("lists the five lifts in order", () => {
    const { container } = render(<StrengthA />);
    const names = [...container.querySelectorAll(".gd-name")].map((n) => n.textContent);
    expect(names).toEqual(["Squat to box", "Bench press", "Pull-ups", "Hip thrusts", "Back extensions"]);
  });

  test("shows no loads or rest times", () => {
    const { container } = render(<StrengthA />);
    expect(container.textContent).not.toMatch(/\b(kg|lbs?|rest)\b/i);
  });

  test("has no animation in its styles", () => {
    const css = readFileSync("src/workouts/StrengthA.css", "utf8");
    expect(css).not.toMatch(/@keyframes|animation|transition/);
  });

  test("is the registered page for strength-a", () => {
    expect(workoutRegistry["strength-a"]).toBe(StrengthA);
  });
});
