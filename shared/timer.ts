export type TimerStatus = "idle" | "running" | "paused" | "done";
export type TimerAction = "start" | "stop" | "reset";
export type TimerDirection = "down" | "up";

/**
 * What is sent over the wire: the state at the moment of sending.
 * `ms` is the time on the clock: time left when counting down, time elapsed when counting up.
 * `totalMs` is the starting time for a countdown, and 0 for a stopwatch.
 * `intervalMs` marks a stopwatch that screens show as a repeating countdown with a round count (an EMOM).
 * `kind: "media"` marks a video: only the status matters (playing, paused or at the start).
 * `leadMs` is set while a started timer is still in its get-ready countdown: the time before the clock begins to move.
 */
export type TimerSnapshot = {
  status: TimerStatus;
  direction: TimerDirection;
  totalMs: number;
  ms: number;
  intervalMs?: number;
  kind?: "media";
  leadMs?: number;
};

/** The get-ready countdown between pressing start and the clock moving. */
export const LEAD_IN_MS = 10_000;

/** The server's own record; `startedAt` is set only while running, and is in the future during the lead-in. */
export type TimerState = TimerSnapshot & { startedAt?: number };

export const TIMER_ACTIONS: readonly TimerAction[] = ["start", "stop", "reset"];

export const isTimerAction = (v: unknown): v is TimerAction => TIMER_ACTIONS.includes(v as TimerAction);

export function idleTimer(totalMs: number): TimerState {
  return { status: "idle", direction: "down", totalMs, ms: totalMs };
}

/** Play, pause and reset a video: it reuses the stopwatch's start, stop and reset. */
export function idleMedia(): TimerState {
  return { status: "idle", direction: "up", totalMs: 0, ms: 0, kind: "media" };
}

export function idleStopwatch(intervalMs?: number): TimerState {
  return { status: "idle", direction: "up", totalMs: 0, ms: 0, ...(intervalMs ? { intervalMs } : {}) };
}

const startMs = (t: TimerSnapshot) => (t.direction === "down" ? t.totalMs : 0);

/** The timer as of `now`: a running countdown has counted down (and is done at zero), a stopwatch has counted up. */
export function snapshotTimer(t: TimerState, now: number): TimerSnapshot {
  const base = {
    direction: t.direction,
    totalMs: t.totalMs,
    ...(t.intervalMs ? { intervalMs: t.intervalMs } : {}),
    ...(t.kind ? { kind: t.kind } : {}),
  };
  if (t.status !== "running") return { ...base, status: t.status, ms: t.ms };
  const startedAt = t.startedAt ?? now;
  if (now < startedAt) return { ...base, status: "running", ms: t.ms, leadMs: startedAt - now };
  const elapsed = now - startedAt;
  if (t.direction === "up") return { ...base, status: "running", ms: t.ms + elapsed };
  const ms = Math.max(0, t.ms - elapsed);
  return { ...base, status: ms === 0 ? "done" : "running", ms };
}

export function applyTimerAction(t: TimerState, action: TimerAction, now: number): TimerState {
  const { leadMs: _lead, ...current } = snapshotTimer(t, now);
  switch (action) {
    case "reset":
      return { ...current, status: "idle", ms: startMs(current) };
    case "start":
      if (current.status === "idle" || current.status === "paused") {
        // A timer that has not moved yet gets a get-ready countdown; a paused one resumes at once. A video just plays.
        const fresh = current.kind !== "media" && current.ms === startMs(current);
        return { ...current, status: "running", startedAt: fresh ? now + LEAD_IN_MS : now };
      }
      return { ...current, startedAt: t.status === "running" ? t.startedAt : undefined };
    case "stop":
      if (current.status === "running") return { ...current, status: "paused" };
      return { ...current, startedAt: t.status === "running" ? t.startedAt : undefined };
  }
}

/** The clock on a client, from a snapshot received at `receivedAt`. */
export function clockNow(snapshot: TimerSnapshot, receivedAt: number, now: number): number {
  if (snapshot.status !== "running") return snapshot.ms;
  const elapsed = Math.max(0, now - receivedAt - (snapshot.leadMs ?? 0));
  return snapshot.direction === "up" ? snapshot.ms + elapsed : Math.max(0, snapshot.ms - elapsed);
}

/** Milliseconds of get-ready countdown still to go; 0 once the clock is moving. */
export function leadInLeft(snapshot: TimerSnapshot, receivedAt: number, now: number): number {
  if (snapshot.status !== "running") return 0;
  return Math.max(0, (snapshot.leadMs ?? 0) - (now - receivedAt));
}

/** m:ss. A countdown rounds up, so it reads 0:00 only when time is truly out; a stopwatch rounds down. */
export function formatClock(ms: number, direction: TimerDirection = "down"): string {
  const seconds = direction === "up" ? Math.floor(Math.max(0, ms) / 1000) : Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** For an interval stopwatch: the time left in the current interval, and how many intervals are complete. */
export function intervalClock(elapsedMs: number, intervalMs: number): { leftMs: number; rounds: number } {
  const elapsed = Math.max(0, elapsedMs);
  return { leftMs: intervalMs - (elapsed % intervalMs), rounds: Math.floor(elapsed / intervalMs) };
}
