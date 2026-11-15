// Renders each strength lift's robot animation to a looping mp4 for the tvOS app, which cannot run the SVG drawings.
// Run: npx tsx scripts/render-robots.ts   (needs ffmpeg)
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { STRENGTH } from "../shared/workouts";
import { robotSvg } from "./robot-svg";
import * as backext from "../src/workouts/robots/backext";
import * as bench from "../src/workouts/robots/bench";
import * as deadlift from "../src/workouts/robots/deadlift";
import * as hipthrust from "../src/workouts/robots/hipthrust";
import * as legextension from "../src/workouts/robots/legextension";
import * as nordic from "../src/workouts/robots/nordic";
import * as pullup from "../src/workouts/robots/pullup";
import * as squat from "../src/workouts/robots/squat";

const modules = { squat, bench, pullup, hipthrust, backext, deadlift, nordic, legextension };
const OUT = new URL("../tvos/GymTV/Resources/robots/", import.meta.url).pathname;
const FPS = 30;
const REST_MS = 1200; // pause between reps, as on the web display
const WIDTH = 640;
const BACKGROUND = "#fbf8f2";

// The robots read performance.now() when a rep starts, so drive it from a fake clock.
let clock = 0;
performance.now = () => clock;

async function render(key: string, movement: keyof typeof modules, load?: number) {
  const { viewBox, createRobot } = modules[movement];
  const robot = createRobot({ reducedMotion: false, load });

  const ffmpeg = spawn("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22",
    "-movflags", "+faststart", `${OUT}${key}.mp4`,
  ]);
  const done = new Promise<void>((resolve, reject) => {
    ffmpeg.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code} for ${key}`))));
  });

  const frame = () => {
    ffmpeg.stdin.write(new Resvg(robotSvg(viewBox, robot.scene(), { width: WIDTH, background: BACKGROUND })).render().asPng());
  };

  frame();
  robot.rep();
  let frames = 1;
  while (robot.busy()) {
    clock += 1000 / FPS;
    robot.step(clock);
    frame();
    frames++;
  }
  for (let i = 0; i < Math.round((REST_MS / 1000) * FPS); i++) { frame(); frames++; }
  ffmpeg.stdin.end();
  await done;
  console.log(`${key}: ${frames} frames`);
}

mkdirSync(OUT, { recursive: true });
const lifts = new Map<string, { movement: keyof typeof modules; load?: number }>();
for (const { lifts: ls } of Object.values(STRENGTH))
  for (const l of ls) if (l.movement) lifts.set(videoKey(l.movement, l.load), { movement: l.movement, load: l.load });
for (const [key, { movement, load }] of lifts) await render(key, movement, load);

/** The app looks a lift's video up by this name; keep it in step with `Lift.videoName` in Models.swift. */
function videoKey(movement: string, load?: number): string {
  return load === undefined ? movement : `${movement}-${load}`;
}
