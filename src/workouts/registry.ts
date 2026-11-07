import type { ComponentType } from "react";
import { CrossFit1, Rehab1, StrengthAPlaceholder } from "./Placeholder";

export const workoutRegistry: Record<string, ComponentType> = {
  "strength-a": StrengthAPlaceholder,
  "crossfit-1": CrossFit1,
  "rehab-1": Rehab1,
};
