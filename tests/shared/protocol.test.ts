import { describe, expect, test } from "vitest";
import { parseClientMessage } from "../../shared/protocol";

describe("parseClientMessage", () => {
  test("valid select parses", () => {
    const raw = JSON.stringify({ type: "select", selection: { userId: "a", categoryId: "b", workoutId: "c" } });
    expect(parseClientMessage(raw)).toEqual({ type: "select", selection: { userId: "a", categoryId: "b", workoutId: "c" } });
  });
  test.each([
    ["not json"],
    [JSON.stringify({ type: "select" })],
    [JSON.stringify({ type: "select", selection: { userId: 1, categoryId: "b", workoutId: "c" } })],
    [JSON.stringify({ type: "other" })],
    ["null"],
  ])("rejects %s", (raw) => {
    expect(parseClientMessage(raw)).toBeNull();
  });

  test.each(["start", "stop", "reset"])("timer %s parses", (action) => {
    expect(parseClientMessage(JSON.stringify({ type: "timer", action }))).toEqual({ type: "timer", action });
  });
  test.each([[JSON.stringify({ type: "timer" })], [JSON.stringify({ type: "timer", action: "pause" })], [JSON.stringify({ type: "timer", action: 5 })]])(
    "rejects timer message %s",
    (raw) => {
      expect(parseClientMessage(raw)).toBeNull();
    },
  );
});
