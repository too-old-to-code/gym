import type { ComponentType } from "react";
import { CrossFit1, Rehab1 } from "./Placeholder";
import { StrengthA } from "./StrengthA";

export const workoutRegistry: Record<string, ComponentType> = {
  "strength-a": StrengthA,
  "crossfit-1": CrossFit1,
  "rehab-1": Rehab1,
};
