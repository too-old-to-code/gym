import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import WebSocket from "ws";
import type { Config } from "../../shared/config";
import { createGymServer } from "../../server/app";

const config: Config = {
  users: [
    { id: "u", name: "U", categories: [{ id: "c", name: "C", workouts: [{ id: "w", name: "W" }] }] },
    { id: "v", name: "V", categories: [{ id: "d", name: "D", workouts: [{ id: "x", name: "X" }] }] },
  ],
};
const sel = { userId: "u", categoryId: "c", workoutId: "w" };

let dir: string;
let stateFile: string;
let staticDir: string;
let servers: Server[] = [];
let sockets: WebSocket[] = [];

async function start(): Promise<number> {
  const server = createGymServer({ config, stateFile, staticDir });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, r));
  return (server.address() as AddressInfo).port;
}

type Client = { ws: WebSocket; next(): Promise<any> };
async function connect(port: number): Promise<Client> {
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  const queue: any[] = [];
  const waiters: ((m: any) => void)[] = [];
  ws.on("message", (d) => {
    const m = JSON.parse(d.toString());
    const w = waiters.shift();
    if (w) w(m);
    else queue.push(m);
  });
  sockets.push(ws);
  await new Promise<void>((r) => ws.on("open", () => r()));
  return {
    ws,
    next: () => new Promise((r) => (queue.length ? r(queue.shift()) : waiters.push(r))),
  };
}
const select = (c: Client, selection: object) => c.ws.send(JSON.stringify({ type: "select", selection }));
const noMessageWithin = (c: Client, ms: number) =>
  Promise.race([c.next().then(() => false), new Promise<boolean>((r) => setTimeout(() => r(true), ms))]);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gym-app-"));
  stateFile = join(dir, "state.json");
  staticDir = join(dir, "dist");
  mkdirSync(staticDir);
  writeFileSync(join(staticDir, "index.html"), "<h1>fixture</h1>");
});
afterEach(async () => {
  sockets.forEach((s) => s.terminate());
  await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
  servers = [];
  sockets = [];
});

describe("gym server", () => {
  test("new client receives null state", async () => {
    const a = await connect(await start());
    expect(await a.next()).toEqual({ type: "state", selection: null });
  });

  test("allowed select is broadcast to all clients", async () => {
    const port = await start();
    const a = await connect(port);
    const b = await connect(port);
    await a.next();
    await b.next();
    select(a, sel);
    expect(await a.next()).toEqual({ type: "state", selection: sel });
    expect(await b.next()).toEqual({ type: "state", selection: sel });
  });

  test("select for a workout not assigned to the user is rejected", async () => {
    const port = await start();
    const a = await connect(port);
    await a.next();
    select(a, sel);
    await a.next();
    select(a, { userId: "u", categoryId: "d", workoutId: "x" });
    expect(await noMessageWithin(a, 150)).toBe(true);
    const b = await connect(port);
    expect(await b.next()).toEqual({ type: "state", selection: sel });
  });

  test("garbage frame is ignored and the socket keeps working", async () => {
    const a = await connect(await start());
    await a.next();
    a.ws.send("garbage");
    select(a, sel);
    expect(await a.next()).toEqual({ type: "state", selection: sel });
    expect(a.ws.readyState).toBe(WebSocket.OPEN);
  });

  test("GET /api/config returns the config", async () => {
    const port = await start();
    const res = await fetch(`http://localhost:${port}/api/config`);
    expect(await res.json()).toEqual(config);
  });

  test("restarted server sends the stored selection", async () => {
    const first = await start();
    const a = await connect(first);
    await a.next();
    select(a, sel);
    await a.next();
    a.ws.terminate();
    await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
    servers = [];
    const b = await connect(await start());
    expect(await b.next()).toEqual({ type: "state", selection: sel });
  });

  test("GET / serves index.html; unknown path 404; traversal blocked", async () => {
    const port = await start();
    expect(await (await fetch(`http://localhost:${port}/`)).text()).toBe("<h1>fixture</h1>");
    expect((await fetch(`http://localhost:${port}/nope.js`)).status).toBe(404);
    const raw = await fetch(`http://localhost:${port}/..%2f..%2fstate.json`);
    expect(raw.status).toBe(404);
  });
});
