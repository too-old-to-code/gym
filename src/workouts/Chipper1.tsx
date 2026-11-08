import { ConditioningWorkout, type Move } from "./ConditioningWorkout";
import type { WorkoutProps } from "./registry";

const MOVES: Move[] = [
  { name: "Row", amount: 50, unit: "cal" },
  { name: "Walking lunges", amount: 40, unit: "reps" },
  { name: "Kettlebell swings", amount: 30, unit: "reps" },
  { name: "Ring dips", amount: 20, unit: "reps" },
  { name: "Sandbag cleans", amount: 10, unit: "reps" },
];

export function Chipper1({ timer }: WorkoutProps) {
  return (
    <ConditioningWorkout
      heading="Chipper"
      skill="Bulgarian split squat"
      clockLabel="Time"
      direction="up"
      startMs={0}
      sections={[{ moves: MOVES, flow: true }]}
      sectionsLabel="Work down the list"
      banner={{ text: "Then back up", arrow: "up" }}
      timer={timer}
    />
  );
}
