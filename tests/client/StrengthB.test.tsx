// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { StrengthB } from "../../src/workouts/StrengthB";
import { workoutRegistry } from "../../src/workouts/registry";

afterEach(cleanup);

describe("StrengthB", () => {
  test("has the B title and the shared warm-up", () => {
    render(<StrengthB />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("All body workout: B");
    expect(screen.getByText("Easy row or bike")).toBeTruthy();
    expect(screen.getByText("then hip openers")).toBeTruthy();
  });

  test("lists the five lifts in order with sets and reps", () => {
    const { container } = render(<StrengthB />);
    const rows = [...container.querySelectorAll(".gd-row")].map((r) => [
      r.querySelector(".gd-name")?.textContent,
      r.querySelector(".gd-score")?.textContent,
    ]);
    expect(rows).toEqual([
      ["Deadlifts", "3×8"],
      ["Bench press", "3×8"],
      ["Weighted pull-ups", "3×6"],
      ["Leg extensions", "3×8"],
      ["Nordics", "3×8"],
    ]);
  });

  test("is registered as strength-b", () => {
    expect(workoutRegistry["strength-b"]).toBe(StrengthB);
  });
});
