import type { Selection } from "../../shared/protocol";
import { useGymSocket } from "../lib/useGymSocket";
import { workoutRegistry } from "../workouts/registry";

export function DisplayView({ selection }: { selection: Selection | null }) {
  const Workout = selection ? workoutRegistry[selection.workoutId] : undefined;
  if (Workout) return <Workout />;
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", fontSize: "12vw" }}>
      <h1>Gym</h1>
    </main>
  );
}

export function Display() {
  const { selection } = useGymSocket();
  return <DisplayView selection={selection} />;
}
