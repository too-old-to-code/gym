import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { isSelectionAllowed, type Config } from "../shared/config";
import { isSelection, type Selection } from "../shared/protocol";

export function createSelectionStore(file: string, config: Config) {
  let current: Selection | null = load();

  function load(): Selection | null {
    try {
      const data: unknown = JSON.parse(readFileSync(file, "utf8"));
      return isSelection(data) && isSelectionAllowed(config, data) ? data : null;
    } catch {
      return null;
    }
  }

  return {
    get: (): Selection | null => current,
    set(s: Selection): void {
      current = s;
      try {
        mkdirSync(dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        writeFileSync(tmp, JSON.stringify(s));
        renameSync(tmp, file);
      } catch (err) {
        console.error("could not save selection:", err);
      }
    },
  };
}
