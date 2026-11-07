import { describe, expect, test } from "vitest";
import { isSelectionAllowed, type Config } from "../../shared/config";

const config: Config = {
  users: [
    {
      id: "andrew",
      name: "Andrew",
      categories: [{ id: "strength", name: "Strength", workouts: [{ id: "strength-a", name: "Strength A" }] }],
    },
    {
      id: "sam",
      name: "Sam",
      categories: [{ id: "rehab", name: "Rehab", workouts: [{ id: "rehab-1", name: "Rehab 1" }] }],
    },
  ],
};

describe("isSelectionAllowed", () => {
  test("assigned workout is allowed", () => {
    expect(isSelectionAllowed(config, { userId: "andrew", categoryId: "strength", workoutId: "strength-a" })).toBe(true);
  });
  test("workout assigned to a different user is rejected", () => {
    expect(isSelectionAllowed(config, { userId: "andrew", categoryId: "rehab", workoutId: "rehab-1" })).toBe(false);
  });
  test("unknown category is rejected", () => {
    expect(isSelectionAllowed(config, { userId: "andrew", categoryId: "nope", workoutId: "strength-a" })).toBe(false);
  });
  test("unknown user is rejected", () => {
    expect(isSelectionAllowed(config, { userId: "zed", categoryId: "strength", workoutId: "strength-a" })).toBe(false);
  });
});
