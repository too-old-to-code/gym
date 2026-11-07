import { useCallback, useEffect, useRef, useState } from "react";
import type { Selection } from "../../shared/protocol";

type Options = { WebSocketImpl?: typeof WebSocket; url?: string };

const MIN_DELAY_MS = 500;
const MAX_DELAY_MS = 5000;

function defaultUrl(): string {
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
}

export function useGymSocket({ WebSocketImpl, url }: Options = {}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const Impl = WebSocketImpl ?? WebSocket;
    const target = url ?? defaultUrl();
    let stopped = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      const ws = new Impl(target);
      socketRef.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          if (msg?.type === "state") setSelection(msg.selection ?? null);
        } catch {
          // ignore malformed frames
        }
      };
      ws.onclose = () => {
        if (socketRef.current === ws) socketRef.current = null;
        setConnected(false);
        if (stopped) return;
        const delay = Math.min(MIN_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
        attempt += 1;
        timer = setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      const ws = socketRef.current;
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      socketRef.current = null;
    };
  }, [WebSocketImpl, url]);

  const select = useCallback((s: Selection) => {
    socketRef.current?.send(JSON.stringify({ type: "select", selection: s }));
  }, []);

  return { selection, connected, select };
}
