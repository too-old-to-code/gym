// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { Yoga1 } from "../../src/workouts/Yoga1";
import { workoutRegistry } from "../../src/workouts/registry";

class FakePlayer {
  static last: FakePlayer | null = null;
  calls: string[] = [];
  constructor(public el: HTMLElement, public opts: { videoId: string; events: { onReady: () => void } }) {
    FakePlayer.last = this;
  }
  playVideo() { this.calls.push("play"); }
  pauseVideo() { this.calls.push("pause"); }
  stopVideo() { this.calls.push("stop"); }
  destroy() {}
}

beforeEach(() => {
  FakePlayer.last = null;
  (window as unknown as { YT: unknown }).YT = { Player: FakePlayer };
});
afterEach(() => {
  cleanup();
  delete (window as unknown as { YT?: unknown }).YT;
});

const timer = (status: "running" | "paused" | "idle") => ({
  status,
  direction: "up" as const,
  totalMs: 0,
  ms: 0,
  kind: "media" as const,
  receivedAt: 0,
});

describe("Yoga1", () => {
  test("has the Yoga heading and plays the video", async () => {
    render(<Yoga1 />);
    await act(async () => {});
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Yoga");
    expect(FakePlayer.last?.opts.videoId).toBe("vNyJuQuuMC8");
  });

  test("waits for Play from the remote", async () => {
    render(<Yoga1 />);
    await act(async () => {});
    act(() => FakePlayer.last?.opts.events.onReady());
    expect(FakePlayer.last?.calls).not.toContain("play");
  });

  test("plays when the shared state is running", async () => {
    render(<Yoga1 timer={timer("running")} />);
    await act(async () => {});
    act(() => FakePlayer.last?.opts.events.onReady());
    expect(FakePlayer.last?.calls).toEqual(["play"]);
  });

  test("is registered as yoga-1", () => {
    expect(workoutRegistry["yoga-1"]).toBe(Yoga1);
  });
});
