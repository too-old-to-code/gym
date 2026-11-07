import { AllBodyWorkout, type Lift } from "./AllBodyWorkout";

const LIFTS: Lift[] = [
  { name: "Squat to box", kit: "Barbell · box at a hip-happy height", sets: 3, reps: 8, movement: "squat" },
  { name: "Bench press", kit: "Barbell · flat bench", sets: 3, reps: 8, movement: "bench" },
  { name: "Pull-ups", kit: "Bodyweight", sets: 3, reps: 10, movement: "pullup" },
  { name: "Hip thrusts", kit: "Barbell · bench", sets: 3, reps: 8, movement: "hipthrust" },
  { name: "Back extensions", kit: "Weighted · Roman chair", sets: 3, reps: 8, movement: "backext" },
];

export function StrengthA() {
  return <AllBodyWorkout title="All body workout: A" lifts={LIFTS} />;
}
