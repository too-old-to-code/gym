import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, test } from "vitest";
import type { Config } from "../../shared/config";
import { createSelectionStore } from "../../server/store";

const config: Config = {
  users: [{ id: "u", name: "U", categories: [{ id: "c", name: "C", workouts: [{ id: "w", name: "W" }] }] }],
};
const sel = { userId: "u", categoryId: "c", workoutId: "w" };

let file: string;
beforeEach(() => {
  file = join(mkdtempSync(join(tmpdir(), "gym-store-")), "nested", "state.json");
});

describe("createSelectionStore", () => {
  test("no file → null", () => {
    expect(createSelectionStore(file, config).get()).toBeNull();
  });
  test("set persists across a new store", () => {
    createSelectionStore(file, config).set(sel);
    expect(createSelectionStore(file, config).get()).toEqual(sel);
  });
  test.each([[""], ["{garbage"], ['{"userId":1}']])("bad file %j → null, no throw", (content) => {
    const dir = mkdtempSync(join(tmpdir(), "gym-store-"));
    const f = join(dir, "state.json");
    writeFileSync(f, content);
    expect(createSelectionStore(f, config).get()).toBeNull();
  });
  test("persisted selection no longer in config → null", () => {
    createSelectionStore(file, config).set(sel);
    const trimmed: Config = { users: [{ id: "u", name: "U", categories: [] }] };
    expect(createSelectionStore(file, trimmed).get()).toBeNull();
  });
  test("a write that fails keeps the selection in memory and does not throw", () => {
    const dir = mkdtempSync(join(tmpdir(), "gym-store-"));
    writeFileSync(join(dir, "blocker"), "file");
    const store = createSelectionStore(join(dir, "blocker", "x", "state.json"), config);
    expect(() => store.set(sel)).not.toThrow();
    expect(store.get()).toEqual(sel);
  });
});
