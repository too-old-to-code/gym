import { useCallback, useEffect, useRef, useState } from "react";
import type { Selection } from "../../shared/protocol";
import { clockNow, type TimerAction, type TimerSnapshot } from "../../shared/timer";

/** A timer snapshot plus when it reached this screen, so the countdown can carry on from there. */
export type TimerView = TimerSnapshot & { receivedAt: number };

type Options = { WebSocketImpl?: typeof WebSocket; url?: string; staleMs?: number };

const MIN_DELAY_MS = 500;
const MAX_DELAY_MS = 5000;
const DEFAULT_STALE_MS = 45_000;
const SOCKET_OPEN = 1;

function defaultUrl(): string {
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
}

export function useGymSocket({ WebSocketImpl, url, staleMs = DEFAULT_STALE_MS }: Options = {}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [timer, setTimer] = useState<TimerView | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const Impl = WebSocketImpl ?? WebSocket;
    const target = url ?? defaultUrl();
    let stopped = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;

    function handleClosed(ws: WebSocket) {
      clearTimeout(watchdog);
      if (socketRef.current === ws) socketRef.current = null;
      setConnected(false);
      if (stopped) return;
      const delay = Math.min(MIN_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
      attempt += 1;
      timer = setTimeout(connect, delay);
    }

    // The server sends a heartbeat every few seconds. A connection that goes silent
    // (wifi dropped without a close) is abandoned and replaced.
    function armWatchdog(ws: WebSocket) {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        ws.onopen = ws.onmessage = ws.onclose = null;
        ws.close();
        handleClosed(ws);
      }, staleMs);
    }

    function connect() {
      const ws = new Impl(target);
      socketRef.current = ws;
      armWatchdog(ws);
      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
      };
      ws.onmessage = (event) => {
        armWatchdog(ws);
        try {
          const msg = JSON.parse(String(event.data));
          if (msg?.type === "state") {
            setSelection(msg.selection ?? null);
            setTimer(msg.timer ? { ...msg.timer, receivedAt: Date.now() } : null);
          }
        } catch {
          // ignore malformed frames
        }
      };
      ws.onclose = () => handleClosed(ws);
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(watchdog);
      const ws = socketRef.current;
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      socketRef.current = null;
    };
  }, [WebSocketImpl, url]);

  const select = useCallback((s: Selection) => {
    const ws = socketRef.current;
    if (ws?.readyState === SOCKET_OPEN) ws.send(JSON.stringify({ type: "select", selection: s }));
  }, []);

  const sendTimer = useCallback((action: TimerAction) => {
    const ws = socketRef.current;
    if (ws?.readyState === SOCKET_OPEN) ws.send(JSON.stringify({ type: "timer", action }));
  }, []);

  return { selection, timer, connected, select, sendTimer };
}

/** Milliseconds left on `timer`, ticking while it runs; null when there is no timer. */
export function useClock(timer: TimerView | null): number | null {
  const [, tick] = useState(0);
  const running = timer?.status === "running";
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 200);
    return () => clearInterval(id);
  }, [running, timer]);
  return timer ? clockNow(timer, timer.receivedAt, Date.now()) : null;
}
