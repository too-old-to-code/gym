import { createReadStream, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import { isSelectionAllowed, type Config } from "../shared/config";
import { parseClientMessage, type ServerMessage } from "../shared/protocol";
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

type Options = { config: Config; stateFile: string; staticDir: string };

export function createGymServer({ config, stateFile, staticDir }: Options): Server {
  const store = createSelectionStore(stateFile, config);
  const wss = new WebSocketServer({ noServer: true });
  const root = normalize(staticDir);

  const stateMessage = (): string => JSON.stringify({ type: "state", selection: store.get() } satisfies ServerMessage);

  wss.on("connection", (ws: WebSocket) => {
    ws.send(stateMessage());
    ws.on("message", (data) => {
      const msg = parseClientMessage(data.toString());
      if (!msg || !isSelectionAllowed(config, msg.selection)) return;
      store.set(msg.selection);
      const out = stateMessage();
      for (const client of wss.clients) if (client.readyState === client.OPEN) client.send(out);
    });
  });

  function resolveFile(urlPath: string): string | null {
    let decoded: string;
    try {
      decoded = decodeURIComponent(urlPath);
    } catch {
      return null;
    }
    const full = normalize(join(root, decoded));
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
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
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
    createReadStream(file).pipe(res);
  });

  server.on("upgrade", (req, socket, head) => {
    if (new URL(req.url ?? "/", "http://localhost").pathname !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  server.on("close", () => wss.close());
  return server;
}
