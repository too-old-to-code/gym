import AVFoundation
import SwiftUI
import UIKit

/// A silent, looping robot video bundled with the app (rendered by `scripts/render-robots.ts`).
/// Shows an empty frame when the lift has no robot.
struct RobotVideo: View {
    @Environment(\.u) private var u
    let name: String?

    var body: some View {
        ZStack {
            Theme.figure
            if let url = name.flatMap({ Bundle.main.url(forResource: $0, withExtension: "mp4") }) {
                // Keyed by file: the player is built once, so a reused row must be rebuilt to switch videos.
                LoopingPlayer(url: url).id(url)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 1.4 * u))
    }
}

private struct LoopingPlayer: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> PlayerView {
        let view = PlayerView()
        let item = AVPlayerItem(url: url)
        let player = AVQueuePlayer()
        player.isMuted = true
        context.coordinator.looper = AVPlayerLooper(player: player, templateItem: item)
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspect
        player.play()
        return view
    }

    func updateUIView(_ view: PlayerView, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator() }
    final class Coordinator { var looper: AVPlayerLooper? }
}

private final class PlayerView: UIView {
    override static var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}
