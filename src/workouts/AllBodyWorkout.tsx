import type { CSSProperties } from "react";
import { RobotFigure, type Movement } from "./robots/RobotFigure";
import "./StrengthA.css";

export type Lift = {
  name: string;
  kit: string;
  sets: number;
  reps: number;
  /** Robot demonstrating the lift; omit when there is no figure yet. */
  movement?: Movement;
  /** Added weight in kg shown on the robot. */
  load?: number;
};

const COLOURS = ["#67E8F9", "#5EEAD4", "#C4B5FD", "#FCD34D", "#93C5FD"];

/** Portrait page: a warm-up card and five lifts, top to bottom. */
export function AllBodyWorkout({ title, lifts }: { title: string; lifts: Lift[] }) {
  return (
    <main className="gd-root">
      <section className="gd-left" aria-label="Warm-up">
        <header className="gd-head">
          <h1 className="gd-label">{title}</h1>
        </header>

        <div className="gd-card gd-warm">
          <h2 className="gd-label">Warm-up</h2>
          <div className="gd-clock">
            <span className="gd-clock-num">10</span>
            <span className="gd-clock-unit">min</span>
          </div>
          <p className="gd-warm-title">Easy row or bike</p>
          <p className="gd-warm-sub">then hip openers</p>
        </div>
      </section>

      <section className="gd-card gd-sq" aria-label={`${title} exercises, in order`}>
        {lifts.map((lift, i) => (
          <article key={lift.name} className="gd-row" style={{ "--c": COLOURS[i % COLOURS.length] } as CSSProperties}>
            <div className="gd-num">{i + 1}</div>
            {lift.movement ? (
              <RobotFigure className="gd-fig" movement={lift.movement} load={lift.load} startDelayMs={i * 700} />
            ) : (
              <div className="robot-fig gd-fig" aria-hidden="true" />
            )}
            <div className="gd-meta">
              <h3 className="gd-name">{lift.name}</h3>
              <p className="gd-kit">{lift.kit}</p>
            </div>
            <div className="gd-rx">
              <div className="gd-score"><span>{lift.sets}</span><span className="gd-times">×</span><span>{lift.reps}</span></div>
              <div className="gd-rx-label">SETS × REPS</div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
