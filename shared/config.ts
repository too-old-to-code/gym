import type { Selection } from "./protocol";

export type Workout = { id: string; name: string };
export type Category = { id: string; name: string; workouts: Workout[] };
export type User = { id: string; name: string; categories: Category[] };
export type Config = { users: User[] };

export function isSelectionAllowed(config: Config, s: Selection): boolean {
  const user = config.users.find((u) => u.id === s.userId);
  const category = user?.categories.find((c) => c.id === s.categoryId);
  return category?.workouts.some((w) => w.id === s.workoutId) ?? false;
}
