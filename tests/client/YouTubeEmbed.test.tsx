// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { YouTubeEmbed } from "../../src/workouts/YouTubeEmbed";

class FakePlayer {
  static last: FakePlayer | null = null;
  calls: string[] = [];
  constructor(
    public el: HTMLElement,
    public opts: { videoId: string; playerVars: Record<string, unknown>; events: { onReady: () => void } },
  ) {
    FakePlayer.last = this;
  }
  playVideo() { this.calls.push("play"); }
  pauseVideo() { this.calls.push("pause"); }
  stopVideo() { this.calls.push("stop"); }
  destroy() { this.calls.push("destroy"); }
  ready() { this.opts.events.onReady(); }
}

beforeEach(() => {
  FakePlayer.last = null;
  (window as unknown as { YT: unknown }).YT = { Player: FakePlayer };
});
afterEach(() => {
  cleanup();
  delete (window as unknown as { YT?: unknown }).YT;
});

const mount = async (status: "idle" | "running" | "paused" | "done") => {
  const view = render(<YouTubeEmbed videoId="abc123" title="t" status={status} />);
  await act(async () => {});
  return view;
};
const player = () => FakePlayer.last as FakePlayer;

describe("YouTubeEmbed", () => {
  test("creates a player for the video with its own controls hidden, not playing, muted and looping", async () => {
    await mount("idle");
    expect(player().opts.videoId).toBe("abc123");
    expect(player().opts.playerVars).toMatchObject({
      controls: 0,
      autoplay: 0,
      mute: 1,
      loop: 1,
      playlist: "abc123",
      playsinline: 1,
      disablekb: 1,
      rel: 0,
    });
  });

  test("an idle video waits at the start without playing", async () => {
    await mount("idle");
    act(() => player().ready());
    expect(player().calls).toEqual(["stop"]);
  });

  test("a video told to play before the player is ready plays once it is", async () => {
    await mount("running");
    expect(player().calls).toEqual([]);
    act(() => player().ready());
    expect(player().calls).toEqual(["play"]);
  });

  test("follows the shared state: play, pause, play again, then reset to the start (stopped, so its thumbnail shows)", async () => {
    const view = await mount("idle");
    act(() => player().ready());
    player().calls.length = 0;
    const set = (status: "idle" | "running" | "paused") =>
      view.rerender(<YouTubeEmbed videoId="abc123" title="t" status={status} />);
    set("running");
    set("paused");
    set("running");
    set("idle");
    expect(player().calls).toEqual(["play", "pause", "play", "stop"]);
  });

  test("the player is destroyed when the page goes away", async () => {
    const view = await mount("idle");
    const p = player();
    view.unmount();
    expect(p.calls).toContain("destroy");
  });

  test("shows a plain thumbnail while waiting at the start, hiding YouTube's own play button", async () => {
    const view = await mount("idle");
    const poster = () => view.container.querySelector(".gd-video-poster") as HTMLImageElement | null;
    expect(poster()?.src).toContain("/vi/abc123/");
    view.rerender(<YouTubeEmbed videoId="abc123" title="t" status="running" />);
    expect(poster()).toBeNull();
    view.rerender(<YouTubeEmbed videoId="abc123" title="t" status="paused" />);
    expect(poster()).toBeNull();
    view.rerender(<YouTubeEmbed videoId="abc123" title="t" status="idle" />);
    expect(poster()).not.toBeNull();
  });
});
