import type { Selection } from "../../shared/protocol";
import { useGymSocket, type TimerView } from "../lib/useGymSocket";
import { workoutRegistry } from "../workouts/registry";

export function DisplayView({ selection, timer = null }: { selection: Selection | null; timer?: TimerView | null }) {
  const Workout = selection ? workoutRegistry[selection.workoutId] : undefined;
  if (Workout) return <Workout timer={timer} />;
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", fontSize: "12vw" }}>
      <h1>Gym</h1>
    </main>
  );
}

export function Display() {
  const { selection, timer } = useGymSocket();
  return <DisplayView selection={selection} timer={timer} />;
}
