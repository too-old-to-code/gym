import type { ComponentType } from "react";
import type { TimerView } from "../lib/useGymSocket";
import { CrossFit1, Rehab1 } from "./Placeholder";
import { libraryPages } from "./library";
import { StrengthA } from "./StrengthA";
import { StrengthB } from "./StrengthB";
import { Yoga1 } from "./Yoga1";

/** What the display hands every workout page. Pages that do not use the timer ignore it. */
export type WorkoutProps = { timer?: TimerView | null };

export const workoutRegistry: Record<string, ComponentType<WorkoutProps>> = {
  "strength-a": StrengthA,
  "strength-b": StrengthB,
  "yoga-1": Yoga1,
  "crossfit-1": CrossFit1,
  "rehab-1": Rehab1,
  ...libraryPages,
};
