import type { Selection } from "./protocol";

export type Workout = {
  id: string;
  name: string;
  /** A countdown, for workouts such as an AMRAP. */
  timerMinutes?: number;
  /** A stopwatch that counts up from zero, for workouts such as rounds for time. */
  stopwatch?: boolean;
  /** A repeating countdown of this many seconds with a round count, for an EMOM. */
  intervalSeconds?: number;
  /** A video: the remote gets Play, Pause and Reset buttons. */
  media?: boolean;
};
export type Category = { id: string; name: string; workouts: Workout[] };
export type User = { id: string; name: string; categories: Category[] };
export type Config = { users: User[] };

export function isSelectionAllowed(config: Config, s: Selection): boolean {
  const user = config.users.find((u) => u.id === s.userId);
  const category = user?.categories.find((c) => c.id === s.categoryId);
  return category?.workouts.some((w) => w.id === s.workoutId) ?? false;
}
