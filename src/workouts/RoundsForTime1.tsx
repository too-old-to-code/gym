import { ConditioningWorkout, type Move } from "./ConditioningWorkout";
import type { WorkoutProps } from "./registry";

const MOVES: Move[] = [
  { name: "Row", amount: 400, unit: "m" },
  { name: "Thrusters", amount: 12, unit: "reps" },
  { name: "Box burpees", amount: 8, unit: "reps" },
];

export function RoundsForTime1({ timer }: WorkoutProps) {
  return (
    <ConditioningWorkout
      heading="Rounds for time"
      skill="Work on cleans"
      clockLabel="5 rounds for time"
      direction="up"
      startMs={0}
      sections={[{ moves: MOVES }]}
      sectionsLabel="One round, in order"
      timer={timer}
    />
  );
}
