import type { ComponentType } from "react";
import { ConditioningWorkout, type Banner, type Move, type Section } from "./ConditioningWorkout";
import type { WorkoutProps } from "./registry";

/** How the page's clock behaves. The server timer in `config/gym.config.json` must agree. */
type Clock =
  | { kind: "amrap"; minutes: number }
  | { kind: "emom"; minutes: number }
  | { kind: "stopwatch" };

export type LibraryWorkout = {
  /** The workout's name, shown small at the top of the page. */
  heading: string;
  /** Label above the clock, such as "15 min AMRAP". */
  clockLabel: string;
  clock: Clock;
  sections: Section[];
  sectionsLabel: string;
  banner?: Banner;
};

const reps = (name: string, amount: number, detail?: string): Move => ({ name, amount, unit: "reps", detail });
const cal = (name: string, amount: number): Move => ({ name, amount, unit: "cal" });
const metres = (name: string, amount: number): Move => ({ name, amount, unit: "m" });

const oddEven = (odd: Move, even: Move): Section[] => [
  { title: "Odd minutes", moves: [odd] },
  { title: "Even minutes", moves: [even] },
];

const finisher = (move: Move): Section => ({ moves: [move] });

export const LIBRARY: Record<string, LibraryWorkout> = {
  "emom-swing-row": {
    heading: "Swing and Row",
    clockLabel: "16 min, every minute on the minute",
    clock: { kind: "emom", minutes: 16 },
    sections: oddEven(reps("Kettlebell swings", 15), cal("Row", 12)),
    sectionsLabel: "Alternate each minute",
  },
  "emom-box-burpee": {
    heading: "Box Burpee EMOM",
    clockLabel: "20 min, every minute on the minute",
    clock: { kind: "emom", minutes: 20 },
    sections: oddEven(reps("Box burpees", 10, "Hands on the box, step back and forward"), cal("Bike", 15)),
    sectionsLabel: "Alternate each minute",
  },
  "emom-hang-hinge": {
    heading: "Hang and Hinge",
    clockLabel: "18 min, every minute on the minute",
    clock: { kind: "emom", minutes: 18 },
    sections: [
      { title: "Minute 1", moves: [reps("Pull-ups", 6, "Or 10 ring rows")] },
      { title: "Minute 2", moves: [reps("Kettlebell deadlifts", 12)] },
      { title: "Minute 3", moves: [{ name: "Dead hang", amount: 30, unit: "sec", detail: "Or rest" }] },
    ],
    sectionsLabel: "Three minutes, then repeat",
  },
  "emom-rope-swing": {
    heading: "Rope and Swing",
    clockLabel: "16 min, every minute on the minute",
    clock: { kind: "emom", minutes: 16 },
    sections: oddEven(reps("Double-unders", 40, "Scale to 30, or singles x2"), reps("Kettlebell swings", 15)),
    sectionsLabel: "Alternate each minute",
  },
  "amrap-pull-push-carry": {
    heading: "Pull, Push, Carry",
    clockLabel: "15 min AMRAP",
    clock: { kind: "amrap", minutes: 15 },
    sections: [
      {
        moves: [
          reps("Ring rows", 5),
          reps("Press-ups", 8),
          reps("Goblet squats", 10),
          metres("Sandbag bear-hug carry", 20),
        ],
      },
    ],
    sectionsLabel: "One round, in order",
  },
  "amrap-floor-grinder": {
    heading: "Floor Grinder",
    clockLabel: "12 min AMRAP",
    clock: { kind: "amrap", minutes: 12 },
    sections: [
      { moves: [reps("Plank walks", 8), reps("Sit-ups", 12), reps("Hip thrusts", 10), reps("Russian twists", 10)] },
    ],
    sectionsLabel: "One round, in order",
  },
  "amrap-cindy-plus": {
    heading: "Cindy Plus",
    clockLabel: "20 min AMRAP",
    clock: { kind: "amrap", minutes: 20 },
    sections: [
      {
        moves: [
          reps("Pull-ups", 5),
          reps("Press-ups", 10),
          reps("Air squats", 15),
          reps("Walking lunges", 20, "Steps, not pairs"),
        ],
      },
    ],
    sectionsLabel: "One round, in order",
  },
  "chipper-slow": {
    heading: "Slow Chipper",
    clockLabel: "Time",
    clock: { kind: "stopwatch" },
    sections: [
      {
        flow: true,
        moves: [
          cal("Row", 40),
          reps("Goblet squats", 30),
          reps("Ring dips", 20, "Or bench dips"),
          reps("Kettlebell swings", 30),
          reps("Sandbag cleans", 20, "To the hip"),
          cal("Bike", 40),
        ],
      },
    ],
    sectionsLabel: "Work down the list",
  },
  "chipper-lunge": {
    heading: "Lunge Chipper",
    clockLabel: "Time",
    clock: { kind: "stopwatch" },
    sections: [
      {
        flow: true,
        moves: [
          reps("Double-unders", 50),
          reps("Walking lunges", 40, "20 each leg"),
          reps("Kettlebell swings", 30),
          reps("Thrusters", 20),
          reps("Ring dips", 20),
          metres("Row", 500),
        ],
      },
    ],
    sectionsLabel: "Work down the list",
  },
  "rft-thruster-triplet": {
    heading: "Thruster Triplet",
    clockLabel: "5 rounds for time",
    clock: { kind: "stopwatch" },
    sections: [{ moves: [cal("Row", 12), reps("Thrusters", 10), reps("Box burpees", 8)] }],
    sectionsLabel: "One round, in order",
  },
  "rft-ring-row": {
    heading: "Ring and Row",
    clockLabel: "4 rounds for time",
    clock: { kind: "stopwatch" },
    sections: [{ moves: [metres("Row", 500), reps("Ring rows", 15), reps("Sandbag front squats", 15)] }],
    sectionsLabel: "One round, in order",
  },
  "ladder-10-to-1": {
    heading: "Ladder 10 to 1",
    clockLabel: "10 down to 1",
    clock: { kind: "stopwatch" },
    sections: [
      {
        title: "10 down to 1",
        note: "reps",
        moves: [{ name: "Kettlebell swings" }, { name: "Press-ups" }, { name: "Box step-ups", detail: "Low box, no jump" }],
      },
    ],
    sectionsLabel: "In order",
  },
  "ladder-hinge": {
    heading: "Hinge Ladder",
    clockLabel: "21-15-9, then 500 m row",
    clock: { kind: "stopwatch" },
    sections: [
      {
        title: "21-15-9",
        note: "reps",
        moves: [{ name: "Kettlebell deadlifts" }, { name: "Ring rows" }, { name: "Sit-ups" }],
      },
      finisher(metres("Row", 500)),
    ],
    sectionsLabel: "In order",
  },
  "ladder-thruster": {
    heading: "Thruster Ladder",
    clockLabel: "21-15-9, then 500 m row",
    clock: { kind: "stopwatch" },
    sections: [
      {
        title: "21-15-9",
        note: "reps",
        moves: [
          { name: "Thrusters" },
          { name: "Pull-ups" },
          { name: "Double-unders", detail: "Double the reps: 42-30-18" },
        ],
      },
      finisher(metres("Row", 500)),
    ],
    sectionsLabel: "In order",
  },
};

function clockProps(clock: Clock) {
  switch (clock.kind) {
    case "amrap":
      return { direction: "down" as const, startMs: clock.minutes * 60_000, urgentMs: 30_000 };
    case "emom":
      return { direction: "up" as const, startMs: 0, intervalMs: 60_000, totalRounds: clock.minutes };
    case "stopwatch":
      return { direction: "up" as const, startMs: 0 };
  }
}

export function libraryPage(workout: LibraryWorkout): ComponentType<WorkoutProps> {
  return function LibraryPage({ timer }: WorkoutProps) {
    return (
      <ConditioningWorkout
        heading={workout.heading}
        clockLabel={workout.clockLabel}
        {...clockProps(workout.clock)}
        sections={workout.sections}
        sectionsLabel={workout.sectionsLabel}
        banner={workout.banner}
        timer={timer}
      />
    );
  };
}

export const libraryPages: Record<string, ComponentType<WorkoutProps>> = Object.fromEntries(
  Object.entries(LIBRARY).map(([id, workout]) => [id, libraryPage(workout)]),
);
