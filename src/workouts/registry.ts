import type { ComponentType } from "react";
import { CrossFit1, Rehab1 } from "./Placeholder";
import { StrengthA } from "./StrengthA";
import { StrengthB } from "./StrengthB";

export const workoutRegistry: Record<string, ComponentType> = {
  "strength-a": StrengthA,
  "strength-b": StrengthB,
  "crossfit-1": CrossFit1,
  "rehab-1": Rehab1,
};
