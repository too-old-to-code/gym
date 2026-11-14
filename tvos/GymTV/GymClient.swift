import Foundation
import SwiftUI

/// Where the gym server lives. Change this to point the app at another server.
enum Server {
    static let base = URL(string: "https://gym.learntoreadthai.co")!
    static var socket: URL {
        var c = URLComponents(url: base, resolvingAgainstBaseURL: false)!
        c.scheme = base.scheme == "https" ? "wss" : "ws"
        c.path = "/ws"
        return c.url!
    }
}

/// Keeps one live view of the gym: which workout is selected, the shared timer, and the content to draw.
@MainActor
final class GymClient: ObservableObject {
    @Published private(set) var selection: Selection?
    @Published private(set) var timer: TimerSnapshot?
    @Published private(set) var timerReceivedAt = Date()
    @Published private(set) var content: WorkoutContent?
    @Published private(set) var config: GymConfig?
    @Published private(set) var connected = false

    private var task: Task<Void, Never>?
    private var socket: URLSessionWebSocketTask?
    private var lastMessage = Date()
    private let session = URLSession(configuration: .ephemeral)
    /// The server sends a heartbeat every 15 s. Silence for this long means the link is dead.
    private let silenceLimit: TimeInterval = 40

    func start() {
        guard task == nil else { return }
        task = Task { [weak self] in await self?.run() }
    }

    func stop() {
        task?.cancel()
        task = nil
        socket?.cancel(with: .goingAway, reason: nil)
    }

    private func run() async {
        var delay: UInt64 = 1
        while !Task.isCancelled {
            await loadContent()
            let ws = session.webSocketTask(with: Server.socket)
            socket = ws
            lastMessage = Date()
            ws.resume()
            let watchdog = Task { [weak self] in
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 5_000_000_000)
                    guard let self, Date().timeIntervalSince(self.lastMessage) > self.silenceLimit else { continue }
                    ws.cancel(with: .goingAway, reason: nil)
                    return
                }
            }
            var gotMessage = false
            receive: while !Task.isCancelled {
                do {
                    let message = try await ws.receive()
                    lastMessage = Date()
                    gotMessage = true
                    connected = true
                    if case .string(let text) = message { handle(Data(text.utf8)) }
                    else if case .data(let data) = message { handle(data) }
                } catch {
                    break receive
                }
            }
            watchdog.cancel()
            connected = false
            if gotMessage { delay = 1 }
            try? await Task.sleep(nanoseconds: delay * 1_000_000_000)
            delay = min(delay * 2, 30)
        }
    }

    func handle(_ data: Data) {
        guard let msg = try? JSONDecoder().decode(ServerMessage.self, from: data), msg.type == "state" else { return }
        selection = msg.selection
        timer = msg.timer
        timerReceivedAt = Date()
    }

    /// Content is fetched on every connect, so a redeploy with new workouts shows up after the next reconnect.
    private func loadContent() async {
        async let workouts = fetch(WorkoutContent.self, path: "api/workouts")
        async let cfg = fetch(GymConfig.self, path: "api/config")
        if let w = await workouts { content = w }
        if let c = await cfg { config = c }
    }

    private func fetch<T: Decodable>(_ type: T.Type, path: String) async -> T? {
        guard let (data, response) = try? await session.data(from: Server.base.appendingPathComponent(path)),
              (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    /// The configured name of the selected workout, for pages that have no drawn content.
    var selectedWorkout: Workout? {
        guard let s = selection else { return nil }
        return config?.users.first { $0.id == s.userId }?
            .categories.first { $0.id == s.categoryId }?
            .workouts.first { $0.id == s.workoutId }
    }
}
