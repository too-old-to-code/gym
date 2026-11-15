import SwiftUI

/// Draws `content` as if the screen were turned by quarter turns, for a monitor mounted on its side.
/// tvOS always outputs landscape, so the app rotates its own page.
struct Rotated<Content: View>: View {
    let quarterTurns: Int
    @ViewBuilder var content: Content

    var body: some View {
        GeometryReader { geo in
            let sideways = quarterTurns % 2 != 0
            content
                .frame(width: sideways ? geo.size.height : geo.size.width, height: sideways ? geo.size.width : geo.size.height)
                .rotationEffect(.degrees(Double(quarterTurns) * 90))
                .frame(width: geo.size.width, height: geo.size.height)
        }
    }
}

/// The web display is a portrait column that is never wider than 9:16, centred on a wider screen.
struct PortraitPage<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        GeometryReader { geo in
            let width = min(geo.size.width, geo.size.height * 9 / 16)
            content
                .environment(\.u, width / 100)
                .environment(\.screenHeight, geo.size.height)
                .frame(width: width, height: geo.size.height)
                .frame(maxWidth: .infinity)
        }
    }
}

struct DisplayRoot: View {
    @ObservedObject var client: GymClient
    /// 0 = landscape, 1 = turned clockwise, 3 = turned anticlockwise. Press play/pause on the remote to change.
    @AppStorage("quarterTurns") private var quarterTurns = 0

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            Rotated(quarterTurns: quarterTurns) { PortraitPage { page } }
        }
        .focusable()
        .onPlayPauseCommand { quarterTurns = quarterTurns == 0 ? 1 : (quarterTurns == 1 ? 3 : 0) }
        .preferredColorScheme(.dark)
    }

    @ViewBuilder private var page: some View {
        if let s = client.selection, let timed = client.content?.timed[s.workoutId] {
            TimedWorkoutView(workout: timed, timer: client.timer, receivedAt: client.timerReceivedAt)
        } else if let s = client.selection, let strength = client.content?.strength[s.workoutId] {
            StrengthView(workout: strength)
        } else if let w = client.selectedWorkout {
            Message(title: w.name, subtitle: w.media == true ? "This one is a video. Play it on the web display." : "Loading the workout…")
        } else {
            Message(title: "Gym", subtitle: client.connected ? "Pick a workout on the remote." : "Connecting…")
        }
    }
}

struct Message: View {
    @Environment(\.u) private var u
    let title: String
    let subtitle: String
    var body: some View {
        VStack(spacing: 2 * u) {
            Text(title).font(.system(size: 12 * u, weight: .bold)).multilineTextAlignment(.center).minimumScaleFactor(0.5)
            Text(subtitle).font(.system(size: 3.4 * u)).foregroundStyle(Theme.ink2).multilineTextAlignment(.center)
        }
        .foregroundStyle(Theme.ink)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Timed workouts (`ConditioningWorkout.tsx`)

struct TimedWorkoutView: View {
    @Environment(\.u) private var u
    let workout: TimedWorkout
    let timer: TimerSnapshot?
    let receivedAt: Date

    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.25)) { context in
            let state = ClockState(workout: workout, timer: timer, receivedAt: receivedAt, now: context.date)
            VStack(alignment: .leading, spacing: 2.2 * u) {
                Caption(text: workout.heading)
                if let skill = workout.skill { skillCard(skill) }
                if let label = workout.clockLabel { clock(label, state) }
                sections(state)
            }
            .padding(3 * u)
            .foregroundStyle(Theme.ink)
        }
    }

    private func skillCard(_ skill: String) -> some View {
        Panel {
            VStack(alignment: .leading, spacing: 1 * u) {
                Caption(text: "Skill")
                Text(skill).font(.system(size: 6 * u, weight: .semibold))
            }
            .padding(.horizontal, 3 * u).padding(.vertical, 2.4 * u)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    /// The countdown sits on the page itself, not in a card.
    private func clock(_ label: String, _ state: ClockState) -> some View {
        VStack(spacing: 0.6 * u) {
            Caption(text: label)
            Text(state.text)
                .font(.system(size: 26 * u, weight: .bold).monospacedDigit()).tracking(-0.04 * 26 * u)
                .lineLimit(1).minimumScaleFactor(0.5)
                .foregroundStyle(state.urgent ? Theme.urgent : Theme.timer)
            if let rounds = state.roundsText {
                HStack(alignment: .firstTextBaseline, spacing: 2 * u) {
                    Caption(text: "Rounds")
                    Text(rounds).font(.system(size: 9 * u, weight: .bold).monospacedDigit())
                }
                .padding(.top, 0.8 * u)
            }
        }
        .padding(.vertical, 1 * u)
        .frame(maxWidth: .infinity)
    }

    private func sections(_ state: ClockState) -> some View {
        WeightedStack(spacing: 2.2 * u) {
            ForEach(Array(workout.sections.enumerated()), id: \.offset) { si, section in
                SectionCard(section: section, offset: offset(si), active: state.activeSection.map { $0 == si })
                    .weight(CGFloat(section.moves.count))
            }
            if let banner = workout.banner { BannerCard(banner: banner) }
        }
    }

    private func offset(_ index: Int) -> Int { workout.sections.prefix(index).reduce(0) { $0 + $1.moves.count } }
}

struct SectionCard: View {
    @Environment(\.u) private var u
    @Environment(\.screenHeight) private var screenHeight
    let section: Section
    let offset: Int
    /// Nil when no block stands out. Otherwise whether this is the block for the current minute.
    let active: Bool?

    var body: some View {
        Panel(ring: active == true) {
            VStack(spacing: 0) {
                if let title = section.title {
                    HStack(alignment: .firstTextBaseline, spacing: 2 * u) {
                        Text(title).font(.system(size: 11 * u, weight: .bold)).tracking(-0.03 * 11 * u)
                        if let note = section.note { Caption(text: note) }
                        Spacer()
                    }
                    .padding(.horizontal, 3 * u).padding(.top, 2.4 * u).padding(.bottom, 1.2 * u)
                    .overlay(alignment: .bottom) { Rectangle().fill(Theme.line).frame(height: 0.2 * u) }
                }
                ForEach(Array(section.moves.enumerated()), id: \.offset) { i, move in
                    MoveRow(move: move, number: offset + i + 1, color: Theme.accent(offset + i),
                            arrowIn: section.flow == true && i > 0, arrowOut: section.flow == true && i < section.moves.count - 1)
                        .frame(maxHeight: .infinity)
                        .overlay(alignment: .top) { if i > 0 { Rectangle().fill(Theme.line).frame(height: 0.2 * u) } }
                }
            }
        }
        .frame(maxHeight: CGFloat(section.moves.count) * 0.15 * screenHeight + (section.title == nil ? 0 : 15 * u))
        .opacity(active == false ? 0.4 : 1)
    }
}

struct MoveRow: View {
    @Environment(\.u) private var u
    let move: Move
    let number: Int
    let color: Color
    let arrowIn: Bool
    let arrowOut: Bool

    var body: some View {
        HStack(spacing: 2 * u) {
            Badge(number: number, color: color)
            VStack(alignment: .leading, spacing: 0.8 * u) {
                Text(move.name).font(.system(size: 6 * u, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.6)
                if let detail = move.detail { Text(detail).font(.system(size: 2.8 * u)).foregroundStyle(Theme.ink2).lineLimit(2) }
            }
            Spacer(minLength: 0)
            if let amount = move.amount {
                let text = amount.display
                VStack(alignment: .trailing, spacing: 1 * u) {
                    Text(text).font(.system(size: (text.count > 4 ? 9 : 13) * u, weight: .bold)).tracking(-0.03 * 13 * u).lineLimit(1)
                    if let unit = move.unit {
                        Text(unit.uppercased()).font(.system(size: 2.2 * u)).tracking(0.14 * 2.2 * u).foregroundStyle(Theme.ink2).lineLimit(1)
                    }
                }
            }
        }
        .padding(.horizontal, 3 * u)
        .overlay(alignment: .topLeading) { GeometryReader { g in arrows(g.size.height) } }
    }

    /// Chipper: a down arrow leads from each movement into the next, through the number badges.
    @ViewBuilder private func arrows(_ height: CGFloat) -> some View {
        let x = 3 * u + 3.5 * u - 0.2 * u
        if arrowIn {
            RoundedRectangle(cornerRadius: 0.2 * u).fill(Theme.ink2).frame(width: 0.4 * u, height: max(0, height / 2 - 4.6 * u)).offset(x: x)
        }
        if arrowOut {
            RoundedRectangle(cornerRadius: 0.2 * u).fill(Theme.ink2).frame(width: 0.4 * u, height: max(0, height / 2 - 4.6 * u))
                .offset(x: x, y: height / 2 + 4.6 * u)
        }
    }
}

struct BannerCard: View {
    @Environment(\.u) private var u
    let banner: Banner
    var body: some View {
        Panel {
            HStack(spacing: 2.4 * u) {
                Image(systemName: banner.arrow == "up" ? "arrow.up" : "arrow.down").font(.system(size: 6 * u, weight: .bold))
                Text(banner.text).font(.system(size: 5 * u, weight: .bold))
            }
            .padding(.horizontal, 3 * u).padding(.vertical, 2.2 * u)
            .frame(maxWidth: .infinity)
        }
        .foregroundStyle(Theme.ink)
    }
}

// MARK: - Strength (`AllBodyWorkout.tsx`)

struct StrengthView: View {
    @Environment(\.u) private var u
    let workout: StrengthWorkout

    var body: some View {
        VStack(alignment: .leading, spacing: 2.2 * u) {
            Caption(text: workout.title)
            warmup
            Panel {
                VStack(spacing: 0) {
                    ForEach(Array(workout.lifts.enumerated()), id: \.offset) { i, lift in
                        LiftRow(lift: lift, number: i + 1, color: Theme.accent(i))
                            .frame(maxHeight: .infinity)
                            .overlay(alignment: .top) { if i > 0 { Rectangle().fill(Theme.line).frame(height: 0.2 * u) } }
                    }
                }
            }
        }
        .padding(3 * u)
        .foregroundStyle(Theme.ink)
    }

    private var warmup: some View {
        Panel {
            VStack(alignment: .leading, spacing: 1 * u) {
                Caption(text: "Warm-up")
                HStack(alignment: .center, spacing: 4 * u) {
                    HStack(alignment: .firstTextBaseline, spacing: 1 * u) {
                        Text("10").font(.system(size: 14 * u, weight: .semibold)).tracking(-0.04 * 14 * u)
                        Text("min").font(.system(size: 4 * u, weight: .medium)).foregroundStyle(Theme.ink2)
                    }
                    VStack(alignment: .leading, spacing: 1 * u) {
                        Text("Easy row or bike").font(.system(size: 5 * u, weight: .semibold))
                        Text("then hip openers").font(.system(size: 3.4 * u)).foregroundStyle(Theme.ink2)
                    }
                    Spacer(minLength: 0)
                }
            }
            .padding(.horizontal, 3 * u).padding(.vertical, 2.4 * u)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct LiftRow: View {
    @Environment(\.u) private var u
    let lift: Lift
    let number: Int
    let color: Color

    var body: some View {
        GeometryReader { geo in
            HStack(spacing: 2 * u) {
                Badge(number: number, color: color)
                RobotVideo(name: lift.videoName)
                    .frame(width: geo.size.width * 0.36 - 3 * u)
                    .frame(maxHeight: 19 * u)
                VStack(alignment: .leading, spacing: 0.8 * u) {
                    Text(lift.name).font(.system(size: 4.2 * u, weight: .semibold)).lineLimit(2).minimumScaleFactor(0.7)
                    Text(lift.kit).font(.system(size: 2.4 * u)).foregroundStyle(Theme.ink2).lineLimit(2)
                }
                Spacer(minLength: 0)
                VStack(alignment: .trailing, spacing: 1 * u) {
                    HStack(spacing: 0) {
                        Text("\(lift.sets)")
                        Text(" × ").foregroundStyle(color)
                        Text("\(lift.reps)")
                    }
                    .font(.system(size: 9 * u, weight: .bold)).tracking(-0.03 * 9 * u).lineLimit(1)
                    Text("SETS × REPS").font(.system(size: 1.6 * u)).tracking(0.14 * 1.6 * u).foregroundStyle(Theme.ink2)
                }
            }
            .padding(.horizontal, 3 * u)
            .frame(height: geo.size.height)
        }
    }
}
