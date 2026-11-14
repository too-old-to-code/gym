/** Workout content as plain data, shared by the web pages and the `/api/workouts` endpoint that native displays read. */

export type Move = { name: string; amount?: number | string; unit?: string; /** A short note under the name. */ detail?: string };

/** A block of movements, optionally under one heading that applies to all of them. */
export type Section = {
  title?: string;
  note?: string;
  moves: Move[];
  /** Draw a down arrow leading from each movement into the next. */
  flow?: boolean;
};

/** A line under the blocks with an arrow, such as "Then back up". */
export type Banner = { text: string; arrow: "up" | "down" };

/** How the page's clock behaves. The server timer in `config/gym.config.json` must agree. */
export type Clock =
  | { kind: "amrap"; minutes: number }
  | { kind: "emom"; minutes: number }
  | { kind: "stopwatch" }
  | { kind: "none" };

export type LibraryWorkout = {
  /** The workout's name, shown small at the top of the page. */
  heading: string;
  /** A skill to practise, shown on its own card. */
  skill?: string;
  /** Label above the clock, such as "15 min AMRAP". Left out when there is no clock. */
  clockLabel?: string;
  clock: Clock;
  sections: Section[];
  sectionsLabel: string;
  banner?: Banner;
};

export const reps = (name: string, amount: number, detail?: string): Move => ({ name, amount, unit: "reps", detail });
export const cal = (name: string, amount: number): Move => ({ name, amount, unit: "cal" });
export const metres = (name: string, amount: number): Move => ({ name, amount, unit: "m" });

const oddEven = (odd: Move, even: Move): Section[] => [
  { title: "Odd minutes", moves: [odd] },
  { title: "Even minutes", moves: [even] },
];

const finisher = (move: Move): Section => ({ moves: [move] });

/** The first six movements are the same in both warm-ups; only the last differs. */
const WARMUP_COMMON: Move[] = [
  { name: "Lunge", amount: 30, unit: "sec each leg" },
  { name: "Kneeling back", amount: 30, unit: "sec" },
  { name: "Quad stretch", amount: 30, unit: "sec each leg" },
  { name: "Copenhagen", amount: 30, unit: "sec each leg" },
  { name: "Bird dog", amount: 60, unit: "sec", detail: "Alternate sides every 10 secs" },
  { name: "Kettlebell knee raise", amount: "3 × 8", unit: "each side" },
];

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

  "amrap-1": {
    heading: "AMRAP",
    skill: "Practise handstands",
    clockLabel: "As many rounds as possible",
    clock: { kind: "amrap", minutes: 20 },
    sections: [{ moves: [cal("Row", 15), reps("Kettlebell swings", 15), reps("Ring rows", 10), reps("Double-unders", 30)] }],
    sectionsLabel: "One round, in order",
  },
  "emom-1": {
    heading: "EMOM",
    skill: "Slow toes to bar",
    clockLabel: "20 min, every minute on the minute",
    clock: { kind: "emom", minutes: 20 },
    sections: [{ moves: [reps("Pull-ups", 5), reps("Press-ups", 10), reps("Squats", 15)] }],
    sectionsLabel: "Each minute",
  },
  "chipper-1": {
    heading: "Chipper",
    skill: "Bulgarian split squat",
    clockLabel: "Time",
    clock: { kind: "stopwatch" },
    sections: [
      {
        flow: true,
        moves: [cal("Row", 50), reps("Walking lunges", 40), reps("Kettlebell swings", 30), reps("Ring dips", 20), reps("Sandbag cleans", 10)],
      },
    ],
    sectionsLabel: "Work down the list",
    banner: { text: "Then back up", arrow: "up" },
  },
  "ladder-1": {
    heading: "Ladder",
    skill: "Overhead squat",
    clockLabel: "21-15-9, then 10 min steady",
    clock: { kind: "stopwatch" },
    sections: [
      { title: "21-15-9", note: "reps", moves: [{ name: "Kettlebell swings" }, { name: "Pull-ups" }, { name: "Box burpees" }] },
      { moves: [{ name: "Rower / bike", amount: 10, unit: "min steady" }] },
    ],
    sectionsLabel: "In order",
  },
  "rft-1": {
    heading: "Rounds for time",
    skill: "Work on cleans",
    clockLabel: "5 rounds for time",
    clock: { kind: "stopwatch" },
    sections: [{ moves: [metres("Row", 400), reps("Thrusters", 12), reps("Box burpees", 8)] }],
    sectionsLabel: "One round, in order",
  },
  "warmup-a": {
    heading: "Warm-up A",
    clock: { kind: "none" },
    sections: [{ moves: [...WARMUP_COMMON, { name: "Crab walks", amount: 8, unit: "each direction" }] }],
    sectionsLabel: "In order",
  },
  "warmup-b": {
    heading: "Warm-up B",
    clock: { kind: "none" },
    sections: [{ moves: [...WARMUP_COMMON, { name: "Side leg raises", amount: 8, unit: "each side" }] }],
    sectionsLabel: "In order",
  },
};

/** The robot figures that can demonstrate a lift on the web display. */
export type Movement = "squat" | "bench" | "pullup" | "hipthrust" | "backext" | "deadlift" | "nordic" | "legextension";

export type Lift = {
  name: string;
  kit: string;
  sets: number;
  reps: number;
  /** Robot demonstrating the lift; omit when there is no figure yet. */
  movement?: Movement;
  /** Added weight in kg shown on the robot. */
  load?: number;
};

export type StrengthWorkout = { title: string; lifts: Lift[] };

export const STRENGTH: Record<string, StrengthWorkout> = {
  "strength-a": {
    title: "All body workout: A",
    lifts: [
      { name: "Squat to box", kit: "Barbell · box at a hip-happy height", sets: 3, reps: 8, movement: "squat" },
      { name: "Bench press", kit: "Barbell · flat bench", sets: 3, reps: 8, movement: "bench" },
      { name: "Pull-ups", kit: "Bodyweight", sets: 3, reps: 10, movement: "pullup" },
      { name: "Hip thrusts", kit: "Barbell · bench", sets: 3, reps: 8, movement: "hipthrust" },
      { name: "Back extensions", kit: "Weighted · Roman chair", sets: 3, reps: 8, movement: "backext" },
    ],
  },
  "strength-b": {
    title: "All body workout: B",
    lifts: [
      { name: "Deadlifts", kit: "Barbell", sets: 3, reps: 8, movement: "deadlift" },
      { name: "Bench press", kit: "Barbell · flat bench", sets: 3, reps: 8, movement: "bench" },
      { name: "Weighted pull-ups", kit: "Weight belt", sets: 3, reps: 6, movement: "pullup", load: 10 },
      { name: "Leg extensions", kit: "Machine", sets: 3, reps: 8, movement: "legextension" },
      { name: "Nordics", kit: "Bodyweight", sets: 3, reps: 8, movement: "nordic" },
    ],
  },
};

/** What `/api/workouts` returns: everything a display needs to draw a workout page. */
export const WORKOUT_CONTENT = { timed: LIBRARY, strength: STRENGTH };
