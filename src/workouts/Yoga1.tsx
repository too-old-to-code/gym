import type { WorkoutProps } from "./registry";
import { YouTubeEmbed } from "./YouTubeEmbed";
import "./StrengthA.css";
import "./Conditioning.css";

export function Yoga1({ timer }: WorkoutProps) {
  return (
    <main className="gd-root gd-video-page">
      <header className="gd-head">
        <h1 className="gd-label">Yoga</h1>
      </header>
      <div className="gd-video-frame">
        <YouTubeEmbed videoId="vNyJuQuuMC8" title="Yoga video" status={timer?.status ?? "idle"} />
      </div>
    </main>
  );
}
