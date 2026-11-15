import SwiftUI

/// The web display's palette (`StrengthA.css`).
enum Theme {
    static let background = Color(hex: 0x263241)
    static let panel = Color(hex: 0x334155)
    static let line = Color(hex: 0x64748B)
    static let ink = Color(hex: 0xF1F5F9)
    static let ink2 = Color(hex: 0xCBD5E1)
    static let timer = Color(hex: 0x4ADE80)
    static let urgent = Color(hex: 0xF87171)
    static let ring = Color(hex: 0x67E8F9)
    static let figure = Color(hex: 0xFBF8F2)
    static let accents: [Color] = [
        Color(hex: 0x67E8F9), Color(hex: 0x5EEAD4), Color(hex: 0xC4B5FD), Color(hex: 0xFCD34D), Color(hex: 0x93C5FD),
    ]
    static func accent(_ i: Int) -> Color { accents[i % accents.count] }
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}

// The web sizes everything in `--u`, 1% of the page width. Here the same unit comes from the environment.
private struct UnitKey: EnvironmentKey { static let defaultValue: CGFloat = 10.8 }
private struct ScreenHeightKey: EnvironmentKey { static let defaultValue: CGFloat = 1920 }
extension EnvironmentValues {
    var u: CGFloat { get { self[UnitKey.self] } set { self[UnitKey.self] = newValue } }
    var screenHeight: CGFloat { get { self[ScreenHeightKey.self] } set { self[ScreenHeightKey.self] = newValue } }
}

/// `.gd-card`: a slate panel with a thin outline.
struct Panel<Content: View>: View {
    @Environment(\.u) private var u
    var ring = false
    @ViewBuilder var content: Content

    var body: some View {
        content
            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 2.4 * u))
            .overlay(RoundedRectangle(cornerRadius: 2.4 * u).stroke(Theme.line, lineWidth: 0.2 * u))
            .overlay { if ring { RoundedRectangle(cornerRadius: 2.4 * u).stroke(Theme.ring, lineWidth: 0.4 * u).padding(-0.4 * u) } }
    }
}

/// `.gd-label`: small spaced capitals.
struct Caption: View {
    @Environment(\.u) private var u
    let text: String
    var body: some View {
        Text(text.uppercased()).font(.system(size: 2.2 * u, weight: .semibold)).tracking(0.16 * 2.2 * u).foregroundStyle(Theme.ink2)
    }
}

/// `.gd-num`: the filled circle with a row's number.
struct Badge: View {
    @Environment(\.u) private var u
    let number: Int
    let color: Color
    var body: some View {
        Text("\(number)").font(.system(size: 3.8 * u, weight: .bold)).foregroundStyle(Theme.background)
            .frame(width: 7 * u, height: 7 * u).background(color, in: Circle())
            .frame(width: 7.5 * u)
    }
}

/// Like flexbox: children with a weight share the leftover height in proportion, with a height cap they ask for;
/// children without one take their natural height.
struct Weight: LayoutValueKey { static let defaultValue: CGFloat? = nil }
extension View { func weight(_ w: CGFloat) -> some View { layoutValue(key: Weight.self, value: w) } }

struct WeightedStack: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        proposal.replacingUnspecifiedDimensions(by: CGSize(width: 100, height: 100))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let width = ProposedViewSize(width: bounds.width, height: nil)
        let gaps = spacing * CGFloat(max(0, subviews.count - 1))
        let natural = subviews.filter { $0[Weight.self] == nil }.reduce(0) { $0 + $1.sizeThatFits(width).height }
        let free = max(0, bounds.height - gaps - natural)
        let total = subviews.reduce(0) { $0 + ($1[Weight.self] ?? 0) }
        var y = bounds.minY
        for s in subviews {
            let proposed: ProposedViewSize
            if let w = s[Weight.self], total > 0 { proposed = ProposedViewSize(width: bounds.width, height: free * w / total) }
            else { proposed = ProposedViewSize(width: bounds.width, height: s.sizeThatFits(width).height) }
            s.place(at: CGPoint(x: bounds.minX, y: y), proposal: proposed)
            y += s.sizeThatFits(proposed).height + spacing
        }
    }
}
