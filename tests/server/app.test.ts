import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { connect as tcpConnect, type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import WebSocket from "ws";
import type { Config } from "../../shared/config";
import { createGymServer } from "../../server/app";

const config: Config = {
  users: [
    {
      id: "u",
      name: "U",
      categories: [
        {
          id: "c",
          name: "C",
          workouts: [
            { id: "w", name: "W" },
            { id: "t", name: "T", timerMinutes: 20 },
            { id: "t2", name: "T2", timerMinutes: 10 },
            { id: "sw", name: "SW", stopwatch: true },
            { id: "em", name: "EM", intervalSeconds: 60 },
          ],
        },
      ],
    },
    { id: "v", name: "V", categories: [{ id: "d", name: "D", workouts: [{ id: "x", name: "X" }] }] },
  ],
};
const sel = { userId: "u", categoryId: "c", workoutId: "w" };
const timed = { userId: "u", categoryId: "c", workoutId: "t" };
const timerMsg = (c: Client, action: string) => c.ws.send(JSON.stringify({ type: "timer", action }));

let dir: string;
let stateFile: string;
let staticDir: string;
let servers: Server[] = [];
let sockets: WebSocket[] = [];

async function start(extra: Partial<Parameters<typeof createGymServer>[0]> = {}): Promise<number> {
  const server = createGymServer({ config, stateFile, staticDir, ...extra });
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
    expect(await a.next()).toEqual({ type: "state", selection: null, timer: null });
  });

  test("allowed select is broadcast to all clients", async () => {
    const port = await start();
    const a = await connect(port);
    const b = await connect(port);
    await a.next();
    await b.next();
    select(a, sel);
    expect(await a.next()).toEqual({ type: "state", selection: sel, timer: null });
    expect(await b.next()).toEqual({ type: "state", selection: sel, timer: null });
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
    expect(await b.next()).toEqual({ type: "state", selection: sel, timer: null });
  });

  test("garbage frame is ignored and the socket keeps working", async () => {
    const a = await connect(await start());
    await a.next();
    a.ws.send("garbage");
    select(a, sel);
    expect(await a.next()).toEqual({ type: "state", selection: sel, timer: null });
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
    expect(await b.next()).toEqual({ type: "state", selection: sel, timer: null });
  });

  test("GET / serves index.html; unknown path 404; traversal blocked", async () => {
    const port = await start();
    expect(await (await fetch(`http://localhost:${port}/`)).text()).toBe("<h1>fixture</h1>");
    expect((await fetch(`http://localhost:${port}/nope.js`)).status).toBe(404);
    const raw = await fetch(`http://localhost:${port}/..%2f..%2fstate.json`);
    expect(raw.status).toBe(404);
  });
});

const rawRequest = (port: number, text: string) =>
  new Promise<string>((resolve) => {
    const sock = tcpConnect(port, "localhost", () => sock.write(text));
    let data = "";
    sock.on("data", (d) => (data += d));
    sock.on("close", () => resolve(data));
    sock.on("error", () => resolve(data));
    setTimeout(() => {
      sock.destroy();
      resolve(data);
    }, 500);
  });
const alive = async (port: number) => (await fetch(`http://localhost:${port}/`)).status === 200;

describe("gym server survives bad input", () => {
  test("malformed request path gets 400 and the server stays up", async () => {
    const port = await start();
    const reply = await rawRequest(port, "GET // HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n");
    expect(reply).toMatch(/^HTTP\/1\.1 400/);
    expect(await alive(port)).toBe(true);
  });

  test("malformed upgrade path does not crash the server", async () => {
    const port = await start();
    await rawRequest(
      port,
      "GET // HTTP/1.1\r\nHost: x\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n",
    );
    expect(await alive(port)).toBe(true);
  });

  test("an oversized socket frame does not crash the server", async () => {
    const port = await start();
    const a = await connect(port);
    await a.next();
    a.ws.send("x".repeat(20_000));
    await new Promise((r) => setTimeout(r, 150));
    expect(await alive(port)).toBe(true);
    const b = await connect(port);
    expect(await b.next()).toEqual({ type: "state", selection: null, timer: null });
  });

  test("a state file that cannot be written does not stop selections being applied", async () => {
    writeFileSync(join(dir, "blocker"), "file");
    stateFile = join(dir, "blocker", "nested", "state.json");
    const port = await start();
    const a = await connect(port);
    await a.next();
    select(a, sel);
    expect(await a.next()).toEqual({ type: "state", selection: sel, timer: null });
    expect(await alive(port)).toBe(true);
  });

  test("an unreadable static file does not crash the server", async () => {
    writeFileSync(join(staticDir, "locked.js"), "x");
    chmodSync(join(staticDir, "locked.js"), 0o000);
    const port = await start();
    await fetch(`http://localhost:${port}/locked.js`).catch(() => null);
    expect(await alive(port)).toBe(true);
  });

  test("STATIC_DIR with a trailing slash still serves files", async () => {
    const port = await start({ staticDir: staticDir + "/" });
    expect(await alive(port)).toBe(true);
  });
});

describe("gym server heartbeat", () => {
  test("clients receive periodic hb messages", async () => {
    const a = await connect(await start({ heartbeatMs: 40 }));
    await a.next();
    expect(await a.next()).toEqual({ type: "hb" });
  });
});


describe("gym server timer", () => {
  const MIN = 60_000;
  const withClock = () => {
    const clock = { now: 1_000_000 };
    return { clock, now: () => clock.now };
  };

  test("a workout without a timer has timer null and ignores timer messages", async () => {
    const a = await connect(await start());
    await a.next();
    select(a, sel);
    expect(await a.next()).toMatchObject({ timer: null });
    timerMsg(a, "start");
    expect(await noMessageWithin(a, 150)).toBe(true);
  });

  test("selecting a timed workout starts it idle at the full time", async () => {
    const a = await connect(await start());
    await a.next();
    select(a, timed);
    expect(await a.next()).toEqual({
      type: "state",
      selection: timed,
      timer: { status: "idle", direction: "down", totalMs: 20 * MIN, ms: 20 * MIN },
    });
  });

  test("start, stop and reset are broadcast to every client", async () => {
    const { clock, now } = withClock();
    const port = await start({ now });
    const a = await connect(port);
    const b = await connect(port);
    await a.next();
    await b.next();
    select(a, timed);
    await a.next();
    await b.next();

    timerMsg(a, "start");
    expect((await a.next()).timer).toMatchObject({ status: "running", ms: 20 * MIN });
    expect((await b.next()).timer).toMatchObject({ status: "running" });

    clock.now += 5000;
    timerMsg(b, "stop");
    expect((await a.next()).timer).toEqual({ status: "paused", direction: "down", totalMs: 20 * MIN, ms: 20 * MIN - 5000 });
    await b.next();

    timerMsg(a, "reset");
    expect((await a.next()).timer).toEqual({ status: "idle", direction: "down", totalMs: 20 * MIN, ms: 20 * MIN });
  });

  test("a client that connects mid-countdown gets the time that is left", async () => {
    const { clock, now } = withClock();
    const port = await start({ now });
    const a = await connect(port);
    await a.next();
    select(a, timed);
    await a.next();
    timerMsg(a, "start");
    await a.next();
    clock.now += 30_000;
    const b = await connect(port);
    expect((await b.next()).timer).toEqual({ status: "running", direction: "down", totalMs: 20 * MIN, ms: 20 * MIN - 30_000 });
  });

  test("picking a different workout resets the timer; picking the same one keeps it running", async () => {
    const { now } = withClock();
    const a = await connect(await start({ now }));
    await a.next();
    select(a, timed);
    await a.next();
    timerMsg(a, "start");
    await a.next();
    select(a, timed);
    expect((await a.next()).timer).toMatchObject({ status: "running" });
    select(a, { ...timed, workoutId: "t2" });
    expect((await a.next()).timer).toEqual({ status: "idle", direction: "down", totalMs: 10 * MIN, ms: 10 * MIN });
  });

  test("a restarted server starts the remembered timed workout idle", async () => {
    const a = await connect(await start());
    await a.next();
    select(a, timed);
    await a.next();
    timerMsg(a, "start");
    await a.next();
    a.ws.terminate();
    await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
    servers = [];
    const b = await connect(await start());
    expect(await b.next()).toMatchObject({ selection: timed, timer: { status: "idle", ms: 20 * MIN } });
  });

  test("a stopwatch workout starts at zero and counts up for every client", async () => {
    const { clock, now } = withClock();
    const port = await start({ now });
    const a = await connect(port);
    await a.next();
    select(a, { ...sel, workoutId: "sw" });
    expect((await a.next()).timer).toEqual({ status: "idle", direction: "up", totalMs: 0, ms: 0 });
    timerMsg(a, "start");
    await a.next();
    clock.now += 90_000;
    const b = await connect(port);
    expect((await b.next()).timer).toEqual({ status: "running", direction: "up", totalMs: 0, ms: 90_000 });
    timerMsg(a, "stop");
    expect((await a.next()).timer).toMatchObject({ status: "paused", ms: 90_000 });
    timerMsg(a, "reset");
    expect((await a.next()).timer).toMatchObject({ status: "idle", ms: 0 });
  });

  test("an interval workout shares a stopwatch that carries its interval", async () => {
    const { clock, now } = withClock();
    const port = await start({ now });
    const a = await connect(port);
    await a.next();
    select(a, { ...sel, workoutId: "em" });
    expect((await a.next()).timer).toEqual({ status: "idle", direction: "up", totalMs: 0, ms: 0, intervalMs: 60_000 });
    timerMsg(a, "start");
    await a.next();
    clock.now += 150_000;
    const b = await connect(port);
    expect((await b.next()).timer).toEqual({ status: "running", direction: "up", totalMs: 0, ms: 150_000, intervalMs: 60_000 });
  });
});
