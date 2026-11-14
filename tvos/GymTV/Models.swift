import Foundation

struct Selection: Codable, Equatable {
    let userId: String
    let categoryId: String
    let workoutId: String
}

enum TimerStatus: String, Codable { case idle, running, paused, done }
enum TimerDirection: String, Codable { case down, up }

/// The server's timer at the moment it was sent. `ms` is time left (down) or elapsed (up).
struct TimerSnapshot: Codable, Equatable {
    let status: TimerStatus
    let direction: TimerDirection
    let totalMs: Double
    let ms: Double
    let intervalMs: Double?
    let kind: String?
}

/// Every message the server sends: a `state` update or a `hb` heartbeat.
struct ServerMessage: Decodable {
    let type: String
    let selection: Selection?
    let timer: TimerSnapshot?
}

// MARK: - /api/config

struct Workout: Codable, Hashable { let id: String; let name: String; let media: Bool? }
struct Category: Codable, Hashable { let id: String; let name: String; let workouts: [Workout] }
struct User: Codable, Hashable { let id: String; let name: String; let categories: [Category] }
struct GymConfig: Codable { let users: [User] }

// MARK: - /api/workouts

struct Move: Codable, Hashable {
    let name: String
    let amount: Amount?
    let unit: String?
    let detail: String?
}

/// `amount` is a number ("15") or text ("3 × 8").
enum Amount: Codable, Hashable {
    case number(Double)
    case text(String)

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let n = try? c.decode(Double.self) { self = .number(n) } else { self = .text(try c.decode(String.self)) }
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self { case .number(let n): try c.encode(n); case .text(let s): try c.encode(s) }
    }
    var display: String {
        switch self {
        case .number(let n): return n == n.rounded() ? String(Int(n)) : String(n)
        case .text(let s): return s
        }
    }
}

struct Section: Codable, Hashable {
    let title: String?
    let note: String?
    let moves: [Move]
    let flow: Bool?
}

struct Banner: Codable, Hashable { let text: String; let arrow: String }

struct Clock: Codable, Hashable {
    let kind: String          // amrap | emom | stopwatch | none
    let minutes: Double?
}

struct TimedWorkout: Codable, Hashable {
    let heading: String
    let skill: String?
    let clockLabel: String?
    let clock: Clock
    let sections: [Section]
    let sectionsLabel: String
    let banner: Banner?
}

struct Lift: Codable, Hashable {
    let name: String
    let kit: String
    let sets: Int
    let reps: Int
}

struct StrengthWorkout: Codable, Hashable { let title: String; let lifts: [Lift] }

struct WorkoutContent: Codable {
    let timed: [String: TimedWorkout]
    let strength: [String: StrengthWorkout]
}
