import SwiftUI

@main
struct GymTVApp: App {
    @StateObject private var client = GymClient()

    var body: some Scene {
        WindowGroup {
            DisplayRoot(client: client)
                .onAppear {
                    UIApplication.shared.isIdleTimerDisabled = true   // a wall display must not sleep
                    client.start()
                }
        }
    }
}
