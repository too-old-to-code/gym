// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useGymSocket } from "../../src/lib/useGymSocket";

class FakeSocket {
  static instances: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  readyState = 0;
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  send(d: string) {
    this.sent.push(d);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  push(selection: unknown) {
    this.onmessage?.({ data: JSON.stringify({ type: "state", selection }) });
  }
}
const a = { userId: "u", categoryId: "c", workoutId: "w" };
const b = { userId: "u", categoryId: "c", workoutId: "w2" };
const opts = (extra: { staleMs?: number } = {}) => ({ WebSocketImpl: FakeSocket as unknown as typeof WebSocket, url: "ws://test/ws", ...extra });

beforeEach(() => {
  FakeSocket.instances = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("useGymSocket", () => {
  test("state message sets selection", () => {
    const { result } = renderHook(() => useGymSocket(opts()));
    act(() => FakeSocket.instances[0].open());
    act(() => FakeSocket.instances[0].push(a));
    expect(result.current.selection).toEqual(a);
    expect(result.current.connected).toBe(true);
  });

  test("keeps selection after close, reconnects, and resyncs", () => {
    const { result } = renderHook(() => useGymSocket(opts()));
    act(() => FakeSocket.instances[0].push(a));
    act(() => FakeSocket.instances[0].close());
    expect(result.current.selection).toEqual(a);
    expect(result.current.connected).toBe(false);
    expect(FakeSocket.instances).toHaveLength(1);
    act(() => vi.advanceTimersByTime(10_000));
    expect(FakeSocket.instances).toHaveLength(2);
    act(() => FakeSocket.instances[1].push(b));
    expect(result.current.selection).toEqual(b);
  });

  test("select sends a select message", () => {
    const { result } = renderHook(() => useGymSocket(opts()));
    act(() => FakeSocket.instances[0].open());
    act(() => result.current.select(a));
    expect(JSON.parse(FakeSocket.instances[0].sent[0])).toEqual({ type: "select", selection: a });
  });

  test("ignores malformed messages", () => {
    const { result } = renderHook(() => useGymSocket(opts()));
    act(() => FakeSocket.instances[0].push(a));
    act(() => FakeSocket.instances[0].onmessage?.({ data: "garbage" }));
    expect(result.current.selection).toEqual(a);
  });

  test("select while the socket is not open sends nothing and does not throw", () => {
    const { result } = renderHook(() => useGymSocket(opts()));
    expect(() => act(() => result.current.select(a))).not.toThrow();
    expect(FakeSocket.instances[0].sent).toEqual([]);
  });

  test("a heartbeat does not change the selection", () => {
    const { result } = renderHook(() => useGymSocket(opts()));
    act(() => FakeSocket.instances[0].push(a));
    act(() => FakeSocket.instances[0].onmessage?.({ data: JSON.stringify({ type: "hb" }) }));
    expect(result.current.selection).toEqual(a);
  });

  test("a connection that goes silent is dropped and reconnected", () => {
    const { result } = renderHook(() => useGymSocket(opts({ staleMs: 1000 })));
    act(() => FakeSocket.instances[0].open());
    act(() => vi.advanceTimersByTime(2000));
    expect(FakeSocket.instances[0].readyState).toBe(3);
    expect(FakeSocket.instances).toHaveLength(2);
    act(() => FakeSocket.instances[1].push(b));
    expect(result.current.selection).toEqual(b);
  });

  test("messages keep a connection alive", () => {
    renderHook(() => useGymSocket(opts({ staleMs: 1000 })));
    act(() => FakeSocket.instances[0].open());
    act(() => vi.advanceTimersByTime(800));
    act(() => FakeSocket.instances[0].onmessage?.({ data: JSON.stringify({ type: "hb" }) }));
    act(() => vi.advanceTimersByTime(800));
    expect(FakeSocket.instances).toHaveLength(1);
  });
});
