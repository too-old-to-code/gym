import { useEffect, useRef, type CSSProperties } from "react";
import * as squat from "./squat";
import * as bench from "./bench";
import * as pullup from "./pullup";
import * as hipthrust from "./hipthrust";
import * as backext from "./backext";
import * as deadlift from "./deadlift";
import * as nordic from "./nordic";
import * as legextension from "./legextension";
import "./RobotFigure.css";

const movements = {
  squat: { ...squat, label: "Squat to box" },
  bench: { ...bench, label: "Bench press" },
  pullup: { ...pullup, label: "Pull-ups" },
  hipthrust: { ...hipthrust, label: "Hip thrusts" },
  backext: { ...backext, label: "Back extensions" },
  deadlift: { ...deadlift, label: "Deadlifts" },
  nordic: { ...nordic, label: "Nordics" },
  legextension: { ...legextension, label: "Leg extensions" },
};

export type Movement = keyof typeof movements;

// Outline width in drawing units, so lines stay about 1px at the intended size. Cheaper than
// vector-effect: non-scaling-stroke, which makes the browser recompute every stroke each frame.
const TARGET_HEIGHT_PX = 205;
const strokeFor = (viewBox: string) => Number(viewBox.split(" ")[3]) / TARGET_HEIGHT_PX;

// A Pi cannot redraw the scene at 60fps; ~30fps looks fine and halves the work.
const FRAME_MS = 33;

type Props = {
  movement: Movement;
  /** Added weight in kg, for movements that show one (pull-ups). */
  load?: number;
  /** Pause between reps, in ms. */
  restMs?: number;
  /** Delay before the first rep, in ms (stagger several figures). */
  startDelayMs?: number;
  /** Set false to freeze the figure. */
  playing?: boolean;
  className?: string;
};

/** Animated robot demonstrating a lift. Reps loop on their own; nothing is clickable. */
export function RobotFigure({ movement, load, restMs = 1200, startDelayMs = 0, playing = true, className }: Props) {
  const stage = useRef<SVGGElement>(null);
  const { viewBox, createRobot, label } = movements[movement];

  useEffect(() => {
    const g = stage.current;
    if (!g) return;
    const reducedMotion =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const robot = createRobot({ reducedMotion, load });
    g.innerHTML = robot.scene();
    if (!playing) return;

    let raf = 0;
    let last = 0;
    let nextRep = performance.now() + startDelayMs;
    const frame = (now: number) => {
      if (robot.busy()) {
        if (now - last >= FRAME_MS) {
          last = now;
          robot.step(now);
          g.innerHTML = robot.scene();
          if (!robot.busy()) nextRep = now + restMs;
        }
      } else if (now >= nextRep) {
        robot.rep();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [movement, load, restMs, startDelayMs, playing, createRobot]);

  return (
    <div className={`robot-fig${className ? ` ${className}` : ""}`}>
      <svg viewBox={viewBox} style={{ "--sw": strokeFor(viewBox) } as CSSProperties} role="img" aria-label={`${label} movement diagram`}>
        <g ref={stage} />
      </svg>
    </div>
  );
}
