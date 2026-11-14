import type { ComponentType } from "react";
import type { TimerView } from "../lib/useGymSocket";
import { Amrap1 } from "./Amrap1";
import { Chipper1 } from "./Chipper1";
import { CrossFit1, Rehab1 } from "./Placeholder";
import { Emom1 } from "./Emom1";
import { Ladder1 } from "./Ladder1";
import { libraryPages } from "./library";
import { RoundsForTime1 } from "./RoundsForTime1";
import { StrengthA } from "./StrengthA";
import { StrengthB } from "./StrengthB";
import { Yoga1 } from "./Yoga1";
import { WarmupA } from "./WarmupA";
import { WarmupB } from "./WarmupB";

/** What the display hands every workout page. Pages that do not use the timer ignore it. */
export type WorkoutProps = { timer?: TimerView | null };

export const workoutRegistry: Record<string, ComponentType<WorkoutProps>> = {
  "strength-a": StrengthA,
  "strength-b": StrengthB,
  "yoga-1": Yoga1,
  "warmup-a": WarmupA,
  "warmup-b": WarmupB,
  "amrap-1": Amrap1,
  "emom-1": Emom1,
  "chipper-1": Chipper1,
  "ladder-1": Ladder1,
  "rft-1": RoundsForTime1,
  "crossfit-1": CrossFit1,
  "rehab-1": Rehab1,
  ...libraryPages,
};
