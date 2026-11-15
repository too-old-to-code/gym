import Foundation

/// Mirrors `shared/timer.ts` so the TV shows the same time as the web display.
enum ClockMath {
    /// The clock on screen, from a snapshot received at `receivedAt`.
    static func now(_ s: TimerSnapshot, receivedAt: Date, at now: Date) -> Double {
        guard s.status == .running else { return s.ms }
        let elapsed = max(0, now.timeIntervalSince(receivedAt) * 1000 - (s.leadMs ?? 0))
        return s.direction == .up ? s.ms + elapsed : max(0, s.ms - elapsed)
    }

    /// Milliseconds of get-ready countdown still to go; 0 once the clock is moving.
    static func leadLeft(_ s: TimerSnapshot, receivedAt: Date, at now: Date) -> Double {
        guard s.status == .running else { return 0 }
        return max(0, (s.leadMs ?? 0) - now.timeIntervalSince(receivedAt) * 1000)
    }

    /// m:ss. A countdown rounds up so it reads 0:00 only when time is truly out; a stopwatch rounds down.
    static func format(_ ms: Double, direction: TimerDirection) -> String {
        let clamped = max(0, ms)
        let seconds = Int(direction == .up ? (clamped / 1000).rounded(.down) : (clamped / 1000).rounded(.up))
        return "\(seconds / 60):" + String(format: "%02d", seconds % 60)
    }

    /// For an interval stopwatch (an EMOM): time left in the current interval, and intervals completed.
    static func interval(elapsedMs: Double, intervalMs: Double) -> (leftMs: Double, rounds: Int) {
        let elapsed = max(0, elapsedMs)
        return (intervalMs - elapsed.truncatingRemainder(dividingBy: intervalMs), Int((elapsed / intervalMs).rounded(.down)))
    }
}

/// What the clock card shows for a workout at a moment in time: the same rules as `ConditioningWorkout.tsx`.
struct ClockState {
    let text: String
    /// True during the get-ready countdown, when `text` is the seconds left.
    let gettingReady: Bool
    let urgent: Bool
    let roundsText: String?
    /// For an EMOM with several blocks: the block for the current minute. Nil when no block stands out.
    let activeSection: Int?

    init(workout: TimedWorkout, timer: TimerSnapshot?, receivedAt: Date, now: Date) {
        let kind = workout.clock.kind
        let minutes = workout.clock.minutes ?? 0
        let direction = timer?.direction ?? (kind == "amrap" ? .down : .up)
        let start = kind == "amrap" ? minutes * 60_000 : 0
        let ms = timer.map { ClockMath.now($0, receivedAt: receivedAt, at: now) } ?? start
        let intervalMs = timer?.intervalMs ?? (kind == "emom" ? 60_000 : nil)
        let interval = intervalMs.map { ClockMath.interval(elapsedMs: ms, intervalMs: $0) }
        let total = kind == "emom" ? Int(minutes) : nil
        let finished = interval != nil && total != nil && interval!.rounds >= total!

        let lead = timer.map { ClockMath.leadLeft($0, receivedAt: receivedAt, at: now) } ?? 0
        gettingReady = lead > 0

        if gettingReady { text = String(Int((lead / 1000).rounded(.up))) }
        else if finished { text = "Done" }
        else if let interval { text = ClockMath.format(interval.leftMs, direction: .down) }
        else { text = ClockMath.format(ms, direction: direction) }

        urgent = !gettingReady && interval == nil && direction == .down && kind == "amrap" && ms <= 30_000
        if let interval {
            roundsText = total.map { "\(min(interval.rounds, $0))/\($0)" } ?? "\(interval.rounds)"
        } else { roundsText = nil }
        activeSection = (interval != nil && total != nil && !finished && workout.sections.count > 1)
            ? interval!.rounds % workout.sections.count : nil
    }
}
