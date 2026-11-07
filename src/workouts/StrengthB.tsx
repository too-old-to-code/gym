import { AllBodyWorkout, type Lift } from "./AllBodyWorkout";

const LIFTS: Lift[] = [
  { name: "Deadlifts", kit: "Barbell", sets: 3, reps: 8, movement: "deadlift" },
  { name: "Bench press", kit: "Barbell · flat bench", sets: 3, reps: 8, movement: "bench" },
  { name: "Weighted pull-ups", kit: "Weight belt", sets: 3, reps: 6, movement: "pullup", load: 10 },
  { name: "Leg extensions", kit: "Machine", sets: 3, reps: 8, movement: "legextension" },
  { name: "Nordics", kit: "Bodyweight", sets: 3, reps: 8, movement: "nordic" },
];

export function StrengthB() {
  return <AllBodyWorkout title="All body workout: B" lifts={LIFTS} />;
}
