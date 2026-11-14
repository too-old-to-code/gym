import SwiftUI

struct DisplayRoot: View {
    @ObservedObject var client: GymClient

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
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
        .preferredColorScheme(.dark)
    }
}

struct Message: View {
    let title: String
    let subtitle: String
    var body: some View {
        VStack(spacing: 24) {
            Text(title).font(.system(size: 120, weight: .bold))
            Text(subtitle).font(.system(size: 40)).foregroundStyle(Theme.label)
        }
    }
}

struct TimedWorkoutView: View {
    let workout: TimedWorkout
    let timer: TimerSnapshot?
    let receivedAt: Date

    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.25)) { context in
            let state = ClockState(workout: workout, timer: timer, receivedAt: receivedAt, now: context.date)
            HStack(alignment: .top, spacing: 40) {
                VStack(alignment: .leading, spacing: 28) {
                    Text(workout.heading).font(.system(size: 48, weight: .bold))
                    if let skill = workout.skill {
                        Card { VStack(alignment: .leading, spacing: 8) { Label(text: "Skill"); Text(skill).font(.system(size: 44, weight: .semibold)) }
                            .frame(maxWidth: .infinity, alignment: .leading) }
                    }
                    if let label = workout.clockLabel {
                        Card {
                            VStack(alignment: .leading, spacing: 8) {
                                Label(text: label)
                                Text(state.text)
                                    .font(.system(size: 190, weight: .bold, design: .rounded).monospacedDigit())
                                    .minimumScaleFactor(0.5).lineLimit(1)
                                    .foregroundStyle(state.urgent ? Theme.urgent : .white)
                                if let rounds = state.roundsText {
                                    HStack { Label(text: "Rounds"); Spacer(); Text(rounds).font(.system(size: 64, weight: .bold)) }
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .frame(width: 640)

                VStack(spacing: 20) {
                    ForEach(Array(workout.sections.enumerated()), id: \.offset) { si, section in
                        SectionView(section: section, offset: sectionOffset(si), active: state.activeSection.map { $0 == si } ?? true)
                            .frame(maxHeight: .infinity)
                            .layoutPriority(Double(section.moves.count))
                    }
                    if let banner = workout.banner {
                        Card { Label(text: banner.text) }.frame(maxWidth: .infinity)
                    }
                }
            }
            .padding(60)
        }
    }

    private func sectionOffset(_ index: Int) -> Int { workout.sections.prefix(index).reduce(0) { $0 + $1.moves.count } }
}

struct SectionView: View {
    let section: Section
    let offset: Int
    let active: Bool

    var body: some View {
        Card(active: active) {
            VStack(spacing: 0) {
                if let title = section.title {
                    HStack(spacing: 16) {
                        Text(title).font(.system(size: 40, weight: .bold))
                        if let note = section.note { Text(note).font(.system(size: 30)).foregroundStyle(Theme.label) }
                        Spacer()
                    }.padding(.bottom, 12)
                }
                ForEach(Array(section.moves.enumerated()), id: \.offset) { i, move in
                    MoveRow(move: move, number: offset + i + 1, color: Theme.accent(offset + i))
                        .frame(maxHeight: .infinity)
                    if section.flow == true, i < section.moves.count - 1 {
                        Image(systemName: "arrow.down").font(.system(size: 26, weight: .bold)).foregroundStyle(Theme.label)
                    }
                }
            }
        }
    }
}

struct MoveRow: View {
    let move: Move
    let number: Int
    let color: Color

    var body: some View {
        HStack(spacing: 24) {
            Text("\(number)").font(.system(size: 40, weight: .bold)).foregroundStyle(color).frame(width: 60)
            VStack(alignment: .leading, spacing: 2) {
                Text(move.name).font(.system(size: 46, weight: .semibold)).minimumScaleFactor(0.6).lineLimit(1)
                if let detail = move.detail { Text(detail).font(.system(size: 28)).foregroundStyle(Theme.label).lineLimit(1) }
            }
            Spacer()
            if let amount = move.amount {
                VStack(alignment: .trailing, spacing: 0) {
                    Text(amount.display).font(.system(size: 64, weight: .bold)).foregroundStyle(color)
                    if let unit = move.unit { Text(unit.uppercased()).font(.system(size: 22, weight: .semibold)).tracking(2).foregroundStyle(Theme.label) }
                }
            }
        }
    }
}

struct StrengthView: View {
    let workout: StrengthWorkout

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text(workout.title).font(.system(size: 48, weight: .bold))
            Text("Warm-up: 10 min easy row or bike, then hip openers").font(.system(size: 32)).foregroundStyle(Theme.label)
            Card {
                VStack(spacing: 0) {
                    ForEach(Array(workout.lifts.enumerated()), id: \.offset) { i, lift in
                        HStack(spacing: 24) {
                            Text("\(i + 1)").font(.system(size: 44, weight: .bold)).foregroundStyle(Theme.accent(i)).frame(width: 60)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(lift.name).font(.system(size: 52, weight: .semibold))
                                Text(lift.kit).font(.system(size: 28)).foregroundStyle(Theme.label)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 0) {
                                Text("\(lift.sets) × \(lift.reps)").font(.system(size: 72, weight: .bold)).foregroundStyle(Theme.accent(i))
                                Text("SETS × REPS").font(.system(size: 22, weight: .semibold)).tracking(2).foregroundStyle(Theme.label)
                            }
                        }.frame(maxHeight: .infinity)
                    }
                }
            }
        }
        .padding(60)
    }
}
