import { useEffect, useRef, useState } from "react";
import type { TimerStatus } from "../../shared/timer";

/** The small part of YouTube's IFrame Player API that this page uses. */
type YTPlayer = { playVideo(): void; pauseVideo(): void; stopVideo(): void; destroy(): void };
type YTApi = {
  Player: new (
    el: HTMLElement,
    opts: { videoId: string; width: string; height: string; playerVars: Record<string, string | number>; events: { onReady: () => void } },
  ) => YTPlayer;
};
type YTWindow = Window & { YT?: YTApi; onYouTubeIframeAPIReady?: () => void };

let apiPromise: Promise<YTApi> | null = null;

function loadYouTubeApi(): Promise<YTApi> {
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  apiPromise ??= new Promise((resolve) => {
    w.onYouTubeIframeAPIReady = () => resolve(w.YT as YTApi);
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

type Props = {
  videoId: string;
  title: string;
  /** What the remote has asked for: running plays, paused pauses, anything else is back at the start. */
  status: TimerStatus;
  /** Browsers only autoplay muted video. Turning this off needs a kiosk browser allowed to autoplay with sound. */
  muted?: boolean;
};

/**
 * A YouTube video driven by the shared Play / Pause / Reset state. The display has no mouse, so
 * YouTube's own controls are hidden and nothing here needs a click.
 */
export function YouTubeEmbed({ videoId, title, status, muted = true }: Props) {
  const slot = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const ready = useRef(false);
  const wanted = useRef(status);

  const apply = (p: YTPlayer, s: TimerStatus) => {
    if (s === "running") {
      p.playVideo();
    } else if (s === "paused") {
      p.pauseVideo();
    } else {
      // back to the start: stopping shows the video's thumbnail instead of a black frame
      p.stopVideo();
    }
  };

  useEffect(() => {
    let gone = false;
    const mountPoint = document.createElement("div");
    slot.current?.appendChild(mountPoint);
    ready.current = false;
    loadYouTubeApi().then((YT) => {
      if (gone) return;
      player.current = new YT.Player(mountPoint, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          mute: muted ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          loop: 1,
          playlist: videoId,
        },
        events: {
          onReady: () => {
            ready.current = true;
            if (player.current) apply(player.current, wanted.current);
          },
        },
      });
    });
    return () => {
      gone = true;
      ready.current = false;
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId, muted]);

  useEffect(() => {
    wanted.current = status;
    if (ready.current && player.current) apply(player.current, status);
  }, [status]);

  const waiting = status !== "running" && status !== "paused";
  const [posterSrc, setPosterSrc] = useState(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);

  return (
    <div className="gd-video" role="img" aria-label={title}>
      <div className="gd-video-player" ref={slot} />
      {waiting && (
        <img
          className="gd-video-poster"
          src={posterSrc}
          alt=""
          onError={() => setPosterSrc(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}
        />
      )}
    </div>
  );
}
