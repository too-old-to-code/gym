// Draws the Apple TV app icon: a robot on a warm light background, as the two layers tvOS needs for its parallax.
// Run: npx tsx scripts/render-tv-icon.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import * as bench from "../src/workouts/robots/bench";
import { robotSvg } from "./robot-svg";

const CATALOG = new URL("../tvos/GymTV/Assets.xcassets/", import.meta.url).pathname;
const BRAND = `${CATALOG}App Icon & Top Shelf Image.brandassets/`;
const INFO = { author: "xcode", version: 1 };

/** Size of the large (App Store) icon. The small icon is 400x240, with a 2x of 800x480. */
const LARGE = { width: 1280, height: 768 };

const back = ({ width, height }: { width: number; height: number }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#fcf4d8"/><stop offset="1" stop-color="#f1dc9c"/></radialGradient></defs>
<rect width="${width}" height="${height}" fill="url(#g)"/></svg>`;

/** The bench drawing is 540 x 460. This 5:3 window shows the barbell and the robot's torso, and leaves the legs out. */
const CROP = "88 14 460 276";

/** The cropped robot at rest on the bench, on a transparent canvas the size of the icon. */
function front({ width }: { width: number; height: number }): Buffer {
  const robot = bench.createRobot({ reducedMotion: false });
  // Outlines are sized for the whole figure, so keep their weight near what the full drawing has.
  const svg = robotSvg(CROP, robot.scene(), { width, strokeHeight: 460 * 0.6 });
  return new Resvg(svg).render().asPng();
}

function write(path: string, data: string | Buffer) {
  mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, data);
}
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";

/** One imagestack layer: a folder holding an imageset with the picture at each scale. */
function layer(stackDir: string, name: "Front" | "Back", scales: { scale: "1x" | "2x"; width: number; height: number }[]) {
  const dir = `${stackDir}${name}.imagestacklayer/`;
  write(`${dir}Contents.json`, json({ info: INFO }));
  const files = scales.map(({ scale, width, height }) => {
    const filename = scale === "1x" ? `${name}.png` : `${name}@2x.png`;
    const size = { width, height };
    write(`${dir}Content.imageset/${filename}`, name === "Back" ? new Resvg(back(size)).render().asPng() : front(size));
    return { idiom: "tv", filename, scale };
  });
  write(`${dir}Content.imageset/Contents.json`, json({ images: files, info: INFO }));
}

function stack(dirName: string, scales: Parameters<typeof layer>[2]) {
  const dir = `${BRAND}${dirName}/`;
  write(`${dir}Contents.json`, json({ layers: [{ filename: "Front.imagestacklayer" }, { filename: "Back.imagestacklayer" }], info: INFO }));
  layer(dir, "Front", scales);
  layer(dir, "Back", scales);
}

write(`${CATALOG}Contents.json`, json({ info: INFO }));
write(`${BRAND}Contents.json`, json({
  assets: [
    { filename: "App Icon - App Store.imagestack", idiom: "tv", role: "primary-app-icon", size: "1280x768" },
    { filename: "App Icon.imagestack", idiom: "tv", role: "primary-app-icon", size: "400x240" },
  ],
  info: INFO,
}));
stack("App Icon - App Store.imagestack", [{ scale: "1x", ...LARGE }]);
stack("App Icon.imagestack", [{ scale: "1x", width: 400, height: 240 }, { scale: "2x", width: 800, height: 480 }]);
console.log("wrote", BRAND);
