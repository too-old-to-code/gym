export type Selection = { userId: string; categoryId: string; workoutId: string };

export type ClientMessage = { type: "select"; selection: Selection };
export type ServerMessage = { type: "state"; selection: Selection | null };

export function isSelection(value: unknown): value is Selection {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.userId === "string" && typeof v.categoryId === "string" && typeof v.workoutId === "string";
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (msg.type === "select" && isSelection(msg.selection)) {
    const { userId, categoryId, workoutId } = msg.selection;
    return { type: "select", selection: { userId, categoryId, workoutId } };
  }
  return null;
}
