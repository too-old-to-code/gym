import { createReadStream, statSync } from "node:fs";
import { pipeline } from "node:stream";
import { createServer, type Server } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import { isSelectionAllowed, type Config } from "../shared/config";
import { parseClientMessage, type Selection, type ServerMessage } from "../shared/protocol";
import { applyTimerAction, idleStopwatch, idleTimer, snapshotTimer, type TimerState } from "../shared/timer";
import { createSelectionStore } from "./store";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

type Options = { config: Config; stateFile: string; staticDir: string; heartbeatMs?: number; now?: () => number };

const MAX_MESSAGE_BYTES = 4096;

function pathOf(url: string | undefined): string | null {
  try {
    return new URL(url ?? "/", "http://localhost").pathname;
  } catch {
    return null;
  }
}

export function createGymServer({ config, stateFile, staticDir, heartbeatMs = 15_000, now = Date.now }: Options): Server {
  const store = createSelectionStore(stateFile, config);
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  const root = resolve(staticDir);

  // A timed workout carries a clock that every screen shares: a countdown (an AMRAP) or a
  // stopwatch (rounds for time). It is not saved across restarts: a restarted server starts the
  // remembered workout's timer from the top.
  const timerFor = (selection: Selection | null): TimerState | null => {
    const workout = config.users
      .find((u) => u.id === selection?.userId)
      ?.categories.find((c) => c.id === selection?.categoryId)
      ?.workouts.find((w) => w.id === selection?.workoutId);
    if (workout?.timerMinutes) return idleTimer(workout.timerMinutes * 60_000);
    if (workout?.intervalSeconds) return idleStopwatch(workout.intervalSeconds * 1000);
    if (workout?.stopwatch) return idleStopwatch();
    return null;
  };
  let timer = timerFor(store.get());

  const stateMessage = (): string =>
    JSON.stringify({
      type: "state",
      selection: store.get(),
      timer: timer ? snapshotTimer(timer, now()) : null,
    } satisfies ServerMessage);
  const broadcast = () => {
    const out = stateMessage();
    for (const client of wss.clients) if (client.readyState === client.OPEN) client.send(out);
  };

  wss.on("connection", (ws: WebSocket) => {
    ws.on("error", (err) => console.error("socket error:", err.message));
    ws.send(stateMessage());
    ws.on("message", (data) => {
      const msg = parseClientMessage(data.toString());
      if (!msg) return;
      if (msg.type === "timer") {
        if (!timer) return;
        timer = applyTimerAction(timer, msg.action, now());
        broadcast();
        return;
      }
      if (!isSelectionAllowed(config, msg.selection)) return;
      const sameWorkout = store.get()?.workoutId === msg.selection.workoutId;
      store.set(msg.selection);
      if (!sameWorkout) timer = timerFor(msg.selection);
      broadcast();
    });
  });

  function resolveFile(urlPath: string): string | null {
    let decoded: string;
    try {
      decoded = decodeURIComponent(urlPath);
    } catch {
      return null;
    }
    const full = resolve(root, "." + sep + decoded);
    if (full !== root && !full.startsWith(root + sep)) return null;
    try {
      const stat = statSync(full);
      if (stat.isFile()) return full;
      if (stat.isDirectory()) {
        const index = join(full, "index.html");
        return statSync(index).isFile() ? index : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  const server = createServer((req, res) => {
    const path = pathOf(req.url);
    if (path === null) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }
    if (req.method === "GET" && path === "/api/config") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(config));
      return;
    }
    const file = req.method === "GET" ? resolveFile(path) : null;
    if (!file) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    pipeline(createReadStream(file), res, () => res.destroy());
  });

  server.on("upgrade", (req, socket, head) => {
    if (pathOf(req.url) !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  const heartbeat = setInterval(() => {
    for (const client of wss.clients) if (client.readyState === client.OPEN) client.send(JSON.stringify({ type: "hb" } satisfies ServerMessage));
  }, heartbeatMs);
  heartbeat.unref();

  server.on("close", () => {
    clearInterval(heartbeat);
    wss.close();
  });
  return server;
}
