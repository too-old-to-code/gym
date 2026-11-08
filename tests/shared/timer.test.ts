import { describe, expect, test } from "vitest";
import { applyTimerAction, clockNow, formatClock, idleMedia, idleStopwatch, idleTimer, intervalClock, snapshotTimer } from "../../shared/timer";

const MIN = 60_000;

describe("timer model", () => {
  test("starts idle with the full time", () => {
    expect(snapshotTimer(idleTimer(20 * MIN), 0)).toEqual({ status: "idle", direction: "down" as const, totalMs: 20 * MIN, ms: 20 * MIN });
  });

  test("start runs and counts down with the clock", () => {
    const t = applyTimerAction(idleTimer(20 * MIN), "start", 1000);
    expect(snapshotTimer(t, 1000)).toMatchObject({ status: "running", ms: 20 * MIN });
    expect(snapshotTimer(t, 6000)).toMatchObject({ status: "running", ms: 20 * MIN - 5000 });
  });

  test("stop pauses and holds the remaining time", () => {
    let t = applyTimerAction(idleTimer(20 * MIN), "start", 0);
    t = applyTimerAction(t, "stop", 5000);
    expect(snapshotTimer(t, 99_000)).toMatchObject({ status: "paused", ms: 20 * MIN - 5000 });
  });

  test("start after stop resumes from where it paused", () => {
    let t = applyTimerAction(idleTimer(20 * MIN), "start", 0);
    t = applyTimerAction(t, "stop", 5000);
    t = applyTimerAction(t, "start", 10_000);
    expect(snapshotTimer(t, 12_000)).toMatchObject({ status: "running", ms: 20 * MIN - 7000 });
  });

  test("reset returns to idle with the full time, from any state", () => {
    let t = applyTimerAction(idleTimer(20 * MIN), "start", 0);
    expect(snapshotTimer(applyTimerAction(t, "reset", 5000), 5000)).toEqual({
      status: "idle",
      direction: "down" as const, totalMs: 20 * MIN,
      ms: 20 * MIN,
    });
    t = applyTimerAction(t, "stop", 5000);
    expect(snapshotTimer(applyTimerAction(t, "reset", 6000), 6000).status).toBe("idle");
  });

  test("reaching zero is done, never negative, and start does nothing until reset", () => {
    let t = applyTimerAction(idleTimer(10_000), "start", 0);
    expect(snapshotTimer(t, 10_000)).toMatchObject({ status: "done", ms: 0 });
    expect(snapshotTimer(t, 50_000)).toMatchObject({ status: "done", ms: 0 });
    t = applyTimerAction(t, "start", 60_000);
    expect(snapshotTimer(t, 61_000).status).toBe("done");
  });

  test("stop when not running changes nothing", () => {
    const t = idleTimer(10_000);
    expect(snapshotTimer(applyTimerAction(t, "stop", 5), 5).status).toBe("idle");
  });
});

describe("client countdown", () => {
  const snap = (status: "idle" | "running" | "paused" | "done", ms: number) => ({ status, direction: "down" as const, totalMs: 20 * MIN, ms });

  test("a running snapshot keeps counting down from when it arrived", () => {
    expect(clockNow(snap("running", 60_000), 1000, 4000)).toBe(57_000);
  });
  test("it never goes below zero", () => {
    expect(clockNow(snap("running", 1000), 0, 9000)).toBe(0);
  });
  test("a paused or idle snapshot does not move", () => {
    expect(clockNow(snap("paused", 60_000), 0, 9000)).toBe(60_000);
    expect(clockNow(snap("idle", 60_000), 0, 9000)).toBe(60_000);
  });
});

describe("formatClock", () => {
  test.each([
    [20 * MIN, "20:00"],
    [59_000, "0:59"],
    [59_001, "1:00"],
    [0, "0:00"],
    [65_000, "1:05"],
  ])("%d ms is %s", (ms, text) => expect(formatClock(ms)).toBe(text));
});


describe("stopwatch (counts up)", () => {
  test("starts idle at zero", () => {
    expect(snapshotTimer(idleStopwatch(), 0)).toEqual({ status: "idle", direction: "up", totalMs: 0, ms: 0 });
  });

  test("runs upwards with the clock and never finishes", () => {
    const t = applyTimerAction(idleStopwatch(), "start", 1000);
    expect(snapshotTimer(t, 6000)).toMatchObject({ status: "running", direction: "up", ms: 5000 });
    expect(snapshotTimer(t, 1000 + 3 * 3_600_000)).toMatchObject({ status: "running", ms: 3 * 3_600_000 });
  });

  test("stop holds the elapsed time and start carries on from it", () => {
    let t = applyTimerAction(idleStopwatch(), "start", 0);
    t = applyTimerAction(t, "stop", 5000);
    expect(snapshotTimer(t, 99_000)).toMatchObject({ status: "paused", ms: 5000 });
    t = applyTimerAction(t, "start", 10_000);
    expect(snapshotTimer(t, 12_000)).toMatchObject({ status: "running", ms: 7000 });
  });

  test("reset goes back to zero", () => {
    let t = applyTimerAction(idleStopwatch(), "start", 0);
    t = applyTimerAction(t, "stop", 5000);
    expect(snapshotTimer(applyTimerAction(t, "reset", 6000), 6000)).toEqual({
      status: "idle",
      direction: "up",
      totalMs: 0,
      ms: 0,
    });
  });

  test("a client carries on counting up from when the snapshot arrived", () => {
    const snap = { status: "running" as const, direction: "up" as const, totalMs: 0, ms: 5000 };
    expect(clockNow(snap, 1000, 4000)).toBe(8000);
    expect(clockNow({ ...snap, status: "paused" }, 1000, 4000)).toBe(5000);
  });

  test("the up clock shows whole elapsed seconds, rounding down", () => {
    expect(formatClock(0, "up")).toBe("0:00");
    expect(formatClock(999, "up")).toBe("0:00");
    expect(formatClock(1000, "up")).toBe("0:01");
    expect(formatClock(75_900, "up")).toBe("1:15");
    expect(formatClock(3_725_000, "up")).toBe("62:05");
  });
});


describe("interval stopwatch (every minute on the minute)", () => {
  const MIN = 60_000;

  test("carries its interval through every state", () => {
    let t = idleStopwatch(MIN);
    expect(snapshotTimer(t, 0)).toEqual({ status: "idle", direction: "up", totalMs: 0, ms: 0, intervalMs: MIN });
    t = applyTimerAction(t, "start", 0);
    expect(snapshotTimer(t, 5000)).toMatchObject({ status: "running", ms: 5000, intervalMs: MIN });
    t = applyTimerAction(t, "stop", 5000);
    expect(snapshotTimer(t, 9000)).toMatchObject({ status: "paused", ms: 5000, intervalMs: MIN });
    expect(snapshotTimer(applyTimerAction(t, "reset", 9000), 9000)).toMatchObject({ status: "idle", ms: 0, intervalMs: MIN });
  });

  test.each([
    [0, 60_000, 0],
    [1000, 59_000, 0],
    [59_999, 1, 0],
    [60_000, 60_000, 1],
    [61_500, 58_500, 1],
    [125_000, 55_000, 2],
    [10 * MIN, 60_000, 10],
  ])("%d ms elapsed leaves %d ms in the minute and %d rounds done", (elapsed, left, rounds) => {
    expect(intervalClock(elapsed, MIN)).toEqual({ leftMs: left, rounds });
  });
});


describe("media controls (play, pause, reset a video)", () => {
  test("carries its kind through play, pause and reset", () => {
    let t = idleMedia();
    expect(snapshotTimer(t, 0)).toMatchObject({ status: "idle", kind: "media" });
    t = applyTimerAction(t, "start", 0);
    expect(snapshotTimer(t, 1000)).toMatchObject({ status: "running", kind: "media" });
    t = applyTimerAction(t, "stop", 1000);
    expect(snapshotTimer(t, 5000)).toMatchObject({ status: "paused", kind: "media" });
    expect(snapshotTimer(applyTimerAction(t, "reset", 5000), 5000)).toMatchObject({ status: "idle", kind: "media", ms: 0 });
  });
});
