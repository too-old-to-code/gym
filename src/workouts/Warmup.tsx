import { ConditioningWorkout, type Move } from "./ConditioningWorkout";

/** The first six movements are the same in both warm-ups; only the last differs. */
const COMMON: Move[] = [
  { name: "Lunge", amount: 30, unit: "sec each leg" },
  { name: "Kneeling back", amount: 30, unit: "sec" },
  { name: "Quad stretch", amount: 30, unit: "sec each leg" },
  { name: "Copenhagen", amount: 30, unit: "sec each leg" },
  { name: "Bird dog", amount: 60, unit: "sec", detail: "Alternate sides every 10 secs" },
  { name: "Kettlebell knee raise", amount: "3 × 8", unit: "each side" },
];

export function Warmup({ heading, last }: { heading: string; last: Move }) {
  return (
    <ConditioningWorkout heading={heading} sections={[{ moves: [...COMMON, last] }]} sectionsLabel="In order" />
  );
}
