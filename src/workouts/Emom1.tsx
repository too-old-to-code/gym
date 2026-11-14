import { ConditioningWorkout, type Move } from "./ConditioningWorkout";
import type { WorkoutProps } from "./registry";

const MOVES: Move[] = [
  { name: "Pull-ups", amount: 5, unit: "reps" },
  { name: "Press-ups", amount: 10, unit: "reps" },
  { name: "Squats", amount: 15, unit: "reps" },
];

export function Emom1({ timer }: WorkoutProps) {
  return (
    <ConditioningWorkout
      heading="EMOM"
      skill="Slow toes to bar"
      clockLabel="20 min, every minute on the minute"
      direction="up"
      startMs={0}
      intervalMs={60_000}
      totalRounds={20}
      sections={[{ moves: MOVES }]}
      sectionsLabel="Each minute"
      timer={timer}
    />
  );
}
