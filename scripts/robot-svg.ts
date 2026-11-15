// Draws a robot scene as a standalone SVG, for the scripts that render robots to pictures.
import { readFileSync } from "node:fs";

/** The web stylesheet with its custom properties filled in, since the rasteriser does not read var(). */
export function flatCss(strokeWidth: number): string {
  const vars: Record<string, string> = {
    "--body": "#6fb1e8", "--deck": "#a4d3f5", "--line": "#1f2a3a", "--detail": "rgba(20, 35, 60, .38)",
  };
  return readFileSync(new URL("../src/workouts/robots/RobotFigure.css", import.meta.url), "utf8")
    .replace(/var\(--sw, 1\.5\)/g, String(strokeWidth))
    .replace(/var\((--[a-z]+)\)/g, (_, name) => vars[name])
    .replace(/background: #fbf8f2;/, "");
}

/** A full SVG for one robot frame. `background` is left out for a transparent picture. `strokeHeight` sets outline width as if the drawing were that tall, for a cropped view. */
export function robotSvg(viewBox: string, scene: string, { width, background, strokeHeight }: { width: number; background?: string; strokeHeight?: number }): string {
  const [x, y, w, h] = viewBox.split(" ").map(Number);
  const height = Math.round((width * h) / w);
  const rect = background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
${rect}<style>${flatCss((strokeHeight ?? h) / 205)}</style><g class="robot-fig">${scene}</g></svg>`;
}
