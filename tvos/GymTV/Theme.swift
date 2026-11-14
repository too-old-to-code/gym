import SwiftUI

enum Theme {
    static let background = Color(red: 0.05, green: 0.07, blue: 0.11)
    static let card = Color(red: 0.09, green: 0.12, blue: 0.18)
    static let label = Color(white: 0.62)
    static let urgent = Color(red: 1.0, green: 0.38, blue: 0.38)
    /// The same accents the web display cycles through.
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

struct Card<Content: View>: View {
    var active = true
    @ViewBuilder var content: Content
    var body: some View {
        content
            .padding(28)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 28))
            .opacity(active ? 1 : 0.35)
    }
}

struct Label: View {
    let text: String
    var body: some View { Text(text.uppercased()).font(.system(size: 26, weight: .semibold)).tracking(3).foregroundStyle(Theme.label) }
}
