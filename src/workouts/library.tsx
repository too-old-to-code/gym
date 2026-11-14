import type { ComponentType } from "react";
import { LIBRARY, type Clock, type LibraryWorkout } from "../../shared/workouts";
import { ConditioningWorkout } from "./ConditioningWorkout";
import type { WorkoutProps } from "./registry";

function clockProps(clock: Clock) {
  switch (clock.kind) {
    case "amrap":
      return { direction: "down" as const, startMs: clock.minutes * 60_000, urgentMs: 30_000 };
    case "emom":
      return { direction: "up" as const, startMs: 0, intervalMs: 60_000, totalRounds: clock.minutes };
    case "stopwatch":
      return { direction: "up" as const, startMs: 0 };
    case "none":
      return {};
  }
}

export function libraryPage(workout: LibraryWorkout): ComponentType<WorkoutProps> {
  return function LibraryPage({ timer }: WorkoutProps) {
    return (
      <ConditioningWorkout
        heading={workout.heading}
        skill={workout.skill}
        clockLabel={workout.clockLabel}
        {...clockProps(workout.clock)}
        sections={workout.sections}
        sectionsLabel={workout.sectionsLabel}
        banner={workout.banner}
        timer={timer}
      />
    );
  };
}

export const libraryPages: Record<string, ComponentType<WorkoutProps>> = Object.fromEntries(
  Object.entries(LIBRARY).map(([id, workout]) => [id, libraryPage(workout)]),
);
