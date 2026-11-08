// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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
    expect(screen.getByRole("button", { name: "Strength" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rehab" })).toBeTruthy();
  });

  test("a saved user skips the user list", () => {
    localStorage.setItem("gym.userId", "sam");
    view();
    expect(screen.queryByText("Andrew")).toBeNull();
    expect(screen.getByRole("button", { name: "Rehab" })).toBeTruthy();
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

  test("lists a user's categories as accordion headers", () => {
    localStorage.setItem("gym.userId", "andrew");
    view();
    expect(screen.getByRole("button", { name: "Strength" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Rehab" }).getAttribute("aria-expanded")).toBe("false");
  });

  test("opens the first section by default when nothing is on the screen", () => {
    localStorage.setItem("gym.userId", "andrew");
    view();
    expect(screen.getByText("Strength A")).toBeTruthy();
    expect(screen.queryByText("Rehab 1")).toBeNull();
  });

  test("tapping a header opens that section and closes the other", () => {
    localStorage.setItem("gym.userId", "andrew");
    view();
    fireEvent.click(screen.getByRole("button", { name: "Rehab" }));
    expect(screen.getByText("Rehab 1")).toBeTruthy();
    expect(screen.queryByText("Strength A")).toBeNull();
  });

  test("tapping the open header closes it", () => {
    localStorage.setItem("gym.userId", "andrew");
    view();
    fireEvent.click(screen.getByRole("button", { name: "Strength" }));
    expect(screen.queryByText("Strength A")).toBeNull();
  });

  test("tapping a workout sends the three ids", () => {
    localStorage.setItem("gym.userId", "andrew");
    const onSelect = vi.fn();
    view(null, onSelect);
    fireEvent.click(screen.getByText("Strength A"));
    expect(onSelect).toHaveBeenCalledWith({ userId: "andrew", categoryId: "strength", workoutId: "strength-a" });
  });

  test("the section holding the workout on the screen opens and is marked current", () => {
    localStorage.setItem("gym.userId", "andrew");
    view({ userId: "sam", categoryId: "rehab", workoutId: "rehab-1" });
    const workout = screen.getByText("Rehab 1").closest("button");
    expect(workout?.getAttribute("aria-current")).toBe("true");
    expect(screen.getByText("On screen")).toBeTruthy();
    expect(screen.queryByText("Strength A")).toBeNull();
  });
});

describe("RemoteView connection state", () => {
  test("shows a reconnecting notice while the socket is down", () => {
    render(<RemoteView config={config} selection={null} onSelect={vi.fn()} connected={false} />);
    expect(screen.getByText("Reconnecting…")).toBeTruthy();
  });
  test("shows no notice while connected", () => {
    render(<RemoteView config={config} selection={null} onSelect={vi.fn()} connected />);
    expect(screen.queryByText("Reconnecting…")).toBeNull();
  });
});

describe("Remote", () => {
  test("retries the config fetch after a failure", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ok: true, json: async () => config });
    vi.stubGlobal("fetch", fetchMock);
    render(<Remote />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.queryByText("Andrew")).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByText("Andrew")).toBeTruthy();
  });

  test("fetches the config and renders the user list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => config })));
    render(<Remote />);
    await waitFor(() => expect(screen.getByText("Andrew")).toBeTruthy());
    vi.unstubAllGlobals();
  });
});
