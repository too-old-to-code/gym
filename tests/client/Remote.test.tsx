// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Config } from "../../shared/config";
import type { Selection } from "../../shared/protocol";

const socket = vi.hoisted(() => ({ selection: null as Selection | null, select: vi.fn() }));
vi.mock("../../src/lib/useGymSocket", () => ({
  useGymSocket: () => ({ selection: socket.selection, connected: true, select: socket.select }),
}));

import { Remote, RemoteView } from "../../src/components/Remote";

const config: Config = {
  users: [
    {
      id: "andrew",
      name: "Andrew",
      categories: [
        { id: "strength", name: "Strength", workouts: [{ id: "strength-a", name: "Strength A" }] },
        { id: "rehab", name: "Rehab", workouts: [{ id: "rehab-1", name: "Rehab 1" }] },
      ],
    },
    { id: "sam", name: "Sam", categories: [{ id: "rehab", name: "Rehab", workouts: [{ id: "rehab-1", name: "Rehab 1" }] }] },
  ],
};

beforeEach(() => {
  localStorage.clear();
  socket.selection = null;
  socket.select.mockClear();
});
afterEach(cleanup);

const view = (selection: Selection | null = null, onSelect = vi.fn()) =>
  render(<RemoteView config={config} selection={selection} onSelect={onSelect} />);

describe("RemoteView", () => {
  test("first launch lists users", () => {
    view();
    expect(screen.getByText("Andrew")).toBeTruthy();
    expect(screen.getByText("Sam")).toBeTruthy();
  });

  test("choosing a user stores it and shows that user's categories", () => {
    view();
    fireEvent.click(screen.getByText("Andrew"));
    expect(localStorage.getItem("gym.userId")).toBe("andrew");
    expect(screen.getByText("Strength")).toBeTruthy();
    expect(screen.getByText("Rehab")).toBeTruthy();
  });

  test("a saved user skips the user list", () => {
    localStorage.setItem("gym.userId", "sam");
    view();
    expect(screen.queryByText("Andrew")).toBeNull();
    expect(screen.getByText("Rehab")).toBeTruthy();
  });

  test("a saved user missing from the config returns to the user list", () => {
    localStorage.setItem("gym.userId", "ghost");
    view();
    expect(screen.getByText("Andrew")).toBeTruthy();
  });

  test("Not you? clears the saved user", () => {
    localStorage.setItem("gym.userId", "sam");
    view();
    fireEvent.click(screen.getByText("Not you?"));
    expect(localStorage.getItem("gym.userId")).toBeNull();
    expect(screen.getByText("Andrew")).toBeTruthy();
  });

  test("tapping a workout sends the three ids", () => {
    localStorage.setItem("gym.userId", "andrew");
    const onSelect = vi.fn();
    view(null, onSelect);
    fireEvent.click(screen.getByText("Strength"));
    fireEvent.click(screen.getByText("Strength A"));
    expect(onSelect).toHaveBeenCalledWith({ userId: "andrew", categoryId: "strength", workoutId: "strength-a" });
  });

  test("the workout on the screen is marked current", () => {
    localStorage.setItem("gym.userId", "andrew");
    view({ userId: "sam", categoryId: "strength", workoutId: "strength-a" });
    fireEvent.click(screen.getByText("Strength"));
    expect(screen.getByText("Strength A").closest("button")?.getAttribute("aria-current")).toBe("true");
  });
});

describe("Remote", () => {
  test("fetches the config and renders the user list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => config })));
    render(<Remote />);
    await waitFor(() => expect(screen.getByText("Andrew")).toBeTruthy());
    vi.unstubAllGlobals();
  });
});
