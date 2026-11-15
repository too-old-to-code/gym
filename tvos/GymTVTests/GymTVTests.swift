import XCTest
@testable import GymTV

final class ClockTests: XCTestCase {
    private func emom(_ minutes: Double, sections: Int = 2) -> TimedWorkout {
        let s = Section(title: "x", note: nil, moves: [], flow: nil)
        return TimedWorkout(heading: "E", skill: nil, clockLabel: "c", clock: Clock(kind: "emom", minutes: minutes),
                            sections: Array(repeating: s, count: sections), sectionsLabel: "", banner: nil)
    }
    private func paused(_ ms: Double) -> TimerSnapshot {
        TimerSnapshot(status: .paused, direction: .up, totalMs: 0, ms: ms, intervalMs: 60_000, kind: nil, leadMs: nil)
    }
    private func state(_ w: TimedWorkout, _ t: TimerSnapshot?) -> ClockState {
        ClockState(workout: w, timer: t, receivedAt: Date(), now: Date())
    }

    func testEmomBeforeStartReadsZeroOfTotal() {
        let s = state(emom(16), nil)
        XCTAssertEqual(s.roundsText, "0/16")
        XCTAssertEqual(s.text, "1:00")
        XCTAssertEqual(s.activeSection, 0)
    }

    func testEmomCountsRoundsAndAlternatesBlocks() {
        let s = state(emom(20), paused(3 * 60_000 + 10_000))
        XCTAssertEqual(s.roundsText, "3/20")
        XCTAssertEqual(s.activeSection, 1)
        XCTAssertEqual(s.text, "0:50")
    }

    func testEmomReadsDoneAtTheEnd() {
        let s = state(emom(16), paused(18 * 60_000))
        XCTAssertEqual(s.text, "Done")
        XCTAssertEqual(s.roundsText, "16/16")
        XCTAssertNil(s.activeSection)
    }

    func testAmrapCountsDownAndTurnsUrgent() {
        let w = TimedWorkout(heading: "A", skill: nil, clockLabel: "c", clock: Clock(kind: "amrap", minutes: 12),
                             sections: [], sectionsLabel: "", banner: nil)
        XCTAssertEqual(state(w, nil).text, "12:00")
        let t = TimerSnapshot(status: .paused, direction: .down, totalMs: 720_000, ms: 20_000, intervalMs: nil, kind: nil, leadMs: nil)
        XCTAssertTrue(state(w, t).urgent)
    }

    func testRunningStopwatchAdvancesWithTime() {
        let t = TimerSnapshot(status: .running, direction: .up, totalMs: 0, ms: 5_000, intervalMs: nil, kind: nil, leadMs: nil)
        let received = Date(timeIntervalSince1970: 1000)
        let ms = ClockMath.now(t, receivedAt: received, at: received.addingTimeInterval(61))
        XCTAssertEqual(ClockMath.format(ms, direction: .up), "1:06")
    }
}

final class LeadInTests: XCTestCase {
    func testGetReadyCountsDownThenClockStarts() {
        let w = TimedWorkout(heading: "A", skill: nil, clockLabel: "c", clock: Clock(kind: "amrap", minutes: 12),
                             sections: [], sectionsLabel: "", banner: nil)
        let t = TimerSnapshot(status: .running, direction: .down, totalMs: 720_000, ms: 720_000, intervalMs: nil, kind: nil, leadMs: 10_000)
        let received = Date(timeIntervalSince1970: 1000)
        let early = ClockState(workout: w, timer: t, receivedAt: received, now: received.addingTimeInterval(3))
        XCTAssertTrue(early.gettingReady)
        XCTAssertEqual(early.text, "7")
        let later = ClockState(workout: w, timer: t, receivedAt: received, now: received.addingTimeInterval(15))
        XCTAssertFalse(later.gettingReady)
        XCTAssertEqual(later.text, "11:55")
    }
}

final class DecodingTests: XCTestCase {
    func testStateMessageWithTimer() throws {
        let json = #"{"type":"state","selection":{"userId":"andrew","categoryId":"emom","workoutId":"emom-swing-row"},"timer":{"status":"idle","direction":"up","totalMs":0,"ms":0,"intervalMs":60000}}"#
        let msg = try JSONDecoder().decode(ServerMessage.self, from: Data(json.utf8))
        XCTAssertEqual(msg.selection?.workoutId, "emom-swing-row")
        XCTAssertEqual(msg.timer?.intervalMs, 60000)
    }

    func testAmountsAreNumbersOrText() throws {
        let json = #"[{"name":"A","amount":15,"unit":"reps"},{"name":"B","amount":"3 × 8"},{"name":"C"}]"#
        let moves = try JSONDecoder().decode([Move].self, from: Data(json.utf8))
        XCTAssertEqual(moves.map { $0.amount?.display }, ["15", "3 × 8", nil])
    }
}
