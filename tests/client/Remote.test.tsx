// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Config } from "../../shared/config";
import type { Selection } from "../../shared/protocol";

const socket = vi.hoisted(() => ({ selection: null as Selection | null, select: vi.fn(), sendTimer: vi.fn() }));
vi.mock("../../src/lib/useGymSocket", () => ({
  useGymSocket: () => ({ selection: socket.selection, timer: null, connected: true, select: socket.select, sendTimer: socket.sendTimer }),
  useClock: (t: { status: string; ms: number } | null) => (t ? t.ms : null),
}));

import { Remote, RemoteView } from "../../src/components/Remote";

const config: Config = {
  users: [
    {
      id: "andrew",
      name: "Andrew",
      categories: [
        { id: "strength", name: "Strength", workouts: [{ id: "strength-a", name: "Strength A" }] },
        { id: "amrap", name: "AMRAP", workouts: [{ id: "amrap-1", name: "AMRAP 1", timerMinutes: 20 }] },
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
    expect(screen.getByRole("tab", { name: "Strength" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Rehab" })).toBeTruthy();
  });

  test("a saved user skips the user list", () => {
    localStorage.setItem("gym.userId", "sam");
    view();
    expect(screen.queryByText("Andrew")).toBeNull();
    expect(screen.getByRole("tab", { name: "Rehab" })).toBeTruthy();
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

  test("shows every category at once as a tab, with the first selected", () => {
    localStorage.setItem("gym.userId", "andrew");
    view();
    const tabs = screen.getAllByRole("tab").map((t) => [t.textContent, t.getAttribute("aria-selected")]);
    expect(tabs).toEqual([
      ["Strength", "true"],
      ["AMRAP", "false"],
      ["Rehab", "false"],
    ]);
  });

  test("lists the selected category's workouts only", () => {
    localStorage.setItem("gym.userId", "andrew");
    view();
    expect(screen.getByText("Strength A")).toBeTruthy();
    expect(screen.queryByText("Rehab 1")).toBeNull();
  });

  test("tapping a category swaps the workout list", () => {
    localStorage.setItem("gym.userId", "andrew");
    view();
    fireEvent.click(screen.getByRole("tab", { name: "Rehab" }));
    expect(screen.getByText("Rehab 1")).toBeTruthy();
    expect(screen.queryByText("Strength A")).toBeNull();
    expect(screen.getByRole("tab", { name: "Rehab" }).getAttribute("aria-selected")).toBe("true");
  });

  test("a section with no workouts says so", () => {
    localStorage.setItem("gym.userId", "sam");
    const empty: Config = {
      users: [{ id: "sam", name: "Sam", categories: [{ id: "emom", name: "EMOM", workouts: [] }] }],
    };
    render(<RemoteView config={empty} selection={null} onSelect={vi.fn()} />);
    expect(screen.getByText("No workouts yet")).toBeTruthy();
  });

  test("tapping a workout sends the three ids", () => {
    localStorage.setItem("gym.userId", "andrew");
    const onSelect = vi.fn();
    view(null, onSelect);
    fireEvent.click(screen.getByText("Strength A"));
    expect(onSelect).toHaveBeenCalledWith({ userId: "andrew", categoryId: "strength", workoutId: "strength-a" });
  });

  test("starts on the category holding the workout on the screen and marks it current", () => {
    localStorage.setItem("gym.userId", "andrew");
    view({ userId: "sam", categoryId: "rehab", workoutId: "rehab-1" });
    const workout = screen.getByText("Rehab 1").closest("button");
    expect(workout?.getAttribute("aria-current")).toBe("true");
    expect(screen.getByText("On screen")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Rehab" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText("Strength A")).toBeNull();
  });
});

describe("RemoteView timer controls", () => {
  const onAmrap = { userId: "andrew", categoryId: "amrap", workoutId: "amrap-1" };
  const timer = (status: "idle" | "running" | "paused" | "done", ms = 20 * 60_000) => ({
    status,
    direction: "down" as const, totalMs: 20 * 60_000,
    ms,
    receivedAt: Date.now(),
  });
  const timed = (t = timer("idle"), onTimer = vi.fn(), selection: Selection | null = onAmrap) => {
    localStorage.setItem("gym.userId", "andrew");
    render(<RemoteView config={config} selection={selection} onSelect={vi.fn()} timer={t} onTimer={onTimer} />);
    return onTimer;
  };

  test("a timed workout on the screen shows Start, Stop and Reset in a bar, with no clock", () => {
    timed();
    for (const name of ["Start", "Stop", "Reset"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(document.querySelector(".timer-bar")).not.toBeNull();
    expect(screen.queryByText("20:00")).toBeNull();
  });

  test("the buttons send start, stop and reset", () => {
    const onTimer = timed(timer("running"));
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onTimer.mock.calls).toEqual([["stop"], ["reset"]]);
  });

  test("start is available when idle", () => {
    const onTimer = timed(timer("idle"));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onTimer).toHaveBeenCalledWith("start");
  });

  test.each([
    ["idle", { Start: false, Stop: true, Reset: true }],
    ["running", { Start: true, Stop: false, Reset: false }],
    ["paused", { Start: false, Stop: true, Reset: false }],
    ["done", { Start: true, Stop: true, Reset: false }],
  ] as const)("%s disables the buttons that do nothing", (status, disabled) => {
    timed(timer(status, status === "done" ? 0 : 20 * 60_000));
    for (const [name, off] of Object.entries(disabled)) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(off);
    }
  });

  test("no controls for a workout without a timer", () => {
    localStorage.setItem("gym.userId", "andrew");
    render(
      <RemoteView
        config={config}
        selection={{ userId: "andrew", categoryId: "strength", workoutId: "strength-a" }}
        onSelect={vi.fn()}
        timer={null}
        onTimer={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  test("the bar stays whichever category is being browsed", () => {
    timed();
    fireEvent.click(screen.getByRole("tab", { name: "Strength" }));
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
  });
});

describe("RemoteView video controls", () => {
  const video = (status: "idle" | "running" | "paused") => ({
    status,
    direction: "up" as const,
    totalMs: 0,
    ms: 0,
    kind: "media" as const,
    receivedAt: Date.now(),
  });
  const onVideo = (status: "idle" | "running" | "paused") => {
    localStorage.setItem("gym.userId", "andrew");
    const onTimer = vi.fn();
    render(
      <RemoteView
        config={config}
        selection={{ userId: "andrew", categoryId: "amrap", workoutId: "amrap-1" }}
        onSelect={vi.fn()}
        timer={video(status)}
        onTimer={onTimer}
      />,
    );
    return onTimer;
  };

  test("a video is controlled with Play, Pause and Reset, not Start and Stop", () => {
    onVideo("idle");
    for (const name of ["Play", "Pause", "Reset"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
  });

  test("the buttons send start, stop and reset", () => {
    const onTimer = onVideo("running");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onTimer.mock.calls).toEqual([["stop"], ["reset"]]);
  });

  test("Play is available when idle or paused, and not while playing", () => {
    onVideo("idle");
    expect((screen.getByRole("button", { name: "Play" }) as HTMLButtonElement).disabled).toBe(false);
    cleanup();
    onVideo("running");
    expect((screen.getByRole("button", { name: "Play" }) as HTMLButtonElement).disabled).toBe(true);
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
