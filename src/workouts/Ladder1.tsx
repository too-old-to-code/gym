import { ConditioningWorkout, type Section } from "./ConditioningWorkout";
import type { WorkoutProps } from "./registry";

const SECTIONS: Section[] = [
  {
    title: "21-15-9",
    note: "reps",
    moves: [{ name: "Kettlebell swings" }, { name: "Pull-ups" }, { name: "Box burpees" }],
  },
  { moves: [{ name: "Rower / bike", amount: 10, unit: "min steady" }] },
];

export function Ladder1({ timer }: WorkoutProps) {
  return (
    <ConditioningWorkout
      heading="Ladder"
      skill="Overhead squat"
      clockLabel="21-15-9, then 10 min steady"
      direction="up"
      startMs={0}
      sections={SECTIONS}
      sectionsLabel="In order"
      timer={timer}
    />
  );
}
