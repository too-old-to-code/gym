import { ConditioningWorkout, type Move } from "./ConditioningWorkout";
import type { WorkoutProps } from "./registry";

const MOVES: Move[] = [
  { name: "Row", amount: 15, unit: "cal" },
  { name: "Kettlebell swings", amount: 15, unit: "reps" },
  { name: "Ring rows", amount: 10, unit: "reps" },
  { name: "Double-unders", amount: 30, unit: "reps" },
];

export function Amrap1({ timer }: WorkoutProps) {
  return (
    <ConditioningWorkout
      heading="AMRAP"
      skill="Practise handstands"
      clockLabel="As many rounds as possible"
      direction="down"
      startMs={20 * 60_000}
      urgentMs={30_000}
      sections={[{ moves: MOVES }]}
      sectionsLabel="One round, in order"
      timer={timer}
    />
  );
}
