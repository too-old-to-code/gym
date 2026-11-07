import { readFileSync } from "node:fs";
import type { Config } from "../shared/config";
import { createGymServer } from "./app";

const config = JSON.parse(readFileSync(new URL("../config/gym.config.json", import.meta.url), "utf8")) as Config;
const port = Number(process.env.PORT ?? 8080);

createGymServer({
  config,
  stateFile: process.env.STATE_FILE ?? "./data/state.json",
  staticDir: process.env.STATIC_DIR ?? "./dist",
}).listen(port, () => console.log(`gym server listening on :${port}`));

process.on("uncaughtException", (err) => console.error("uncaught exception:", err));
