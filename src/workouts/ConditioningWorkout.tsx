import type { CSSProperties } from "react";
import { formatClock, intervalClock, type TimerDirection } from "../../shared/timer";
import { useClock } from "../lib/useGymSocket";
import type { WorkoutProps } from "./registry";
import "./StrengthA.css";
import "./Conditioning.css";

/** `amount` is left out when the block's heading carries it, such as "21-15-9". */
export type Move = { name: string; amount?: number | string; unit?: string; /** A short note under the name. */ detail?: string };

/** A block of movements, optionally under one heading that applies to all of them. */
export type Section = {
  title?: string;
  note?: string;
  moves: Move[];
  /** Draw a down arrow leading from each movement into the next. */
  flow?: boolean;
};

/** A line under the blocks with an arrow, such as "Then back up". */
export type Banner = { text: string; arrow: "up" | "down" };

type Props = WorkoutProps & {
  /** Small heading at the top of the page, such as "AMRAP". */
  heading: string;
  /** Left out on pages with no skill card, such as a warm-up. */
  skill?: string;
  /** Label above the clock. Left out on pages with no clock. */
  clockLabel?: string;
  /** Countdown (time left) or stopwatch (time elapsed). */
  direction?: TimerDirection;
  /** What the clock shows before the server has sent a timer. */
  startMs?: number;
  /** An EMOM: show a repeating countdown of this length and count the rounds. Used until the server sends its own. */
  intervalMs?: number;
  /** A countdown turns red once this little time is left. */
  urgentMs?: number;
  sections: Section[];
  sectionsLabel: string;
  banner?: Banner;
};

const COLOURS = ["#67E8F9", "#5EEAD4", "#C4B5FD", "#FCD34D", "#93C5FD"];

/** Portrait page for a timed workout: a skill, a big shared clock, and the movements in order. */
export function ConditioningWorkout({
  heading,
  skill,
  clockLabel,
  direction = "up",
  startMs = 0,
  intervalMs: defaultIntervalMs,
  urgentMs,
  sections,
  sectionsLabel,
  banner,
  timer = null,
}: Props) {
  const ms = useClock(timer) ?? startMs;
  const intervalMs = timer?.intervalMs ?? defaultIntervalMs;
  const interval = intervalMs ? intervalClock(ms, intervalMs) : null;
  const urgent = !interval && direction === "down" && urgentMs !== undefined && ms <= urgentMs;
  return (
    <main className="gd-root">
      <section className="gd-left" aria-label="Skill and time">
        <header className="gd-head">
          <h1 className="gd-label">{heading}</h1>
        </header>

        {skill && (
          <div className="gd-card gd-skill">
            <h2 className="gd-label">Skill</h2>
            <p className="gd-skill-name">{skill}</p>
          </div>
        )}

        {clockLabel !== undefined && (
        <div className="gd-timer" data-urgent={String(urgent)}>
          <h2 className="gd-label">{clockLabel}</h2>
          <p className="gd-timer-clock">
            {interval ? formatClock(interval.leftMs, "down") : formatClock(ms, timer?.direction ?? direction)}
          </p>
          {interval && (
            <p className="gd-rounds">
              <span className="gd-label">Rounds</span>
              <span className="gd-rounds-count">{interval.rounds}</span>
            </p>
          )}
        </div>
        )}
      </section>

      <div className="gd-sections" role="group" aria-label={sectionsLabel}>
        {sections.map((section, si) => {
          const offset = sections.slice(0, si).reduce((n, x) => n + x.moves.length, 0);
          return (
            <section
              key={section.title ?? `section-${si}`}
              className={`gd-card gd-sq gd-moves${section.title ? " gd-group" : ""}`}
              style={
                {
                  flexGrow: section.moves.length,
                  gridTemplateRows: `${section.title ? "auto " : ""}repeat(${section.moves.length}, minmax(0, 1fr))`,
                  "--rows": section.moves.length,
                  "--extra": section.title ? "calc(15 * var(--u))" : "0px",
                } as CSSProperties
              }
            >
              {section.title && (
                <h2 className="gd-group-title">
                  {section.title}
                  {section.note && <span className="gd-group-note">{section.note}</span>}
                </h2>
              )}
              {section.moves.map((m, i) => (
                <article
                  key={m.name}
                  className={`gd-row gd-row-plain${m.amount === undefined ? " gd-row-name-only" : ""}`}
                  style={{ "--c": COLOURS[(offset + i) % COLOURS.length] } as CSSProperties}
                >
                  {section.flow && i > 0 && <span className="gd-arrow-in" aria-hidden="true" />}
                  {section.flow && i < section.moves.length - 1 && <span className="gd-arrow-out" aria-hidden="true" />}
                  <div className="gd-num">{offset + i + 1}</div>
                  <div className="gd-meta">
                    <h3 className="gd-name">{m.name}</h3>
                    {m.detail && <p className="gd-kit">{m.detail}</p>}
                  </div>
                  {m.amount !== undefined && (
                    <div className="gd-rx">
                      <div className={`gd-score${String(m.amount).length > 4 ? " gd-score-wide" : ""}`}>
                        <span>{m.amount}</span>
                      </div>
                      {m.unit && <div className="gd-rx-label">{m.unit.toUpperCase()}</div>}
                    </div>
                  )}
                </article>
              ))}
            </section>
          );
        })}
        {banner && (
          <div className="gd-card gd-banner">
            <svg className={`gd-banner-arrow-${banner.arrow}`} viewBox="0 0 24 24" aria-hidden="true">
              <path d={banner.arrow === "up" ? "M12 21V4M5 11l7-7 7 7" : "M12 3v17M5 13l7 7 7-7"} />
            </svg>
            <span>{banner.text}</span>
          </div>
        )}
      </div>
    </main>
  );
}
