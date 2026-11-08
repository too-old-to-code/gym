import { useEffect, useState } from "react";
import type { Config } from "../../shared/config";
import type { Selection } from "../../shared/protocol";
import type { TimerAction } from "../../shared/timer";
import { useGymSocket, type TimerView } from "../lib/useGymSocket";
import "./Remote.css";

const USER_KEY = "gym.userId";
const CONFIG_RETRY_MS = 2000;

function readSavedUser(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

function writeSavedUser(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(USER_KEY);
    else localStorage.setItem(USER_KEY, id);
  } catch {
    // storage unavailable: the user is simply asked again next time
  }
}

type ViewProps = {
  config: Config;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
  connected?: boolean;
  timer?: TimerView | null;
  onTimer?: (action: TimerAction) => void;
};

/** Fixed bar along the bottom; it slides in when a timed workout is on the screen. */
function TimerBar({ timer, onTimer }: { timer: TimerView; onTimer: (action: TimerAction) => void }) {
  const status = timer.status;
  return (
    <div className="timer-bar" role="group" aria-label="Timer">
      <button className="start" disabled={status === "running" || status === "done"} onClick={() => onTimer("start")}>
        Start
      </button>
      <button disabled={status !== "running"} onClick={() => onTimer("stop")}>
        Stop
      </button>
      <button disabled={status === "idle"} onClick={() => onTimer("reset")}>
        Reset
      </button>
    </div>
  );
}

export function RemoteView({ config, selection, onSelect, connected = true, timer = null, onTimer }: ViewProps) {
  const [savedUserId, setSavedUserId] = useState<string | null>(readSavedUser);
  // undefined: follow what is on the screen; otherwise the category the person tapped.
  const [picked, setPicked] = useState<string | undefined>(undefined);

  const user = config.users.find((u) => u.id === savedUserId);

  const offline = connected ? null : <p className="offline">Reconnecting…</p>;

  if (!user) {
    return (
      <main className="remote">
        {offline}
        <h1>Who are you?</h1>
        <div className="people">
          {config.users.map((u) => (
            <button
              key={u.id}
              className="person"
              onClick={() => {
                writeSavedUser(u.id);
                setSavedUserId(u.id);
                setPicked(undefined);
              }}
            >
              {u.name}
            </button>
          ))}
        </div>
      </main>
    );
  }

  const onScreen = user.categories.find((c) => c.workouts.some((w) => w.id === selection?.workoutId));
  const category =
    user.categories.find((c) => c.id === picked) ?? onScreen ?? user.categories[0];

  const showTimer = timer !== null && onTimer !== undefined;
  return (
    <main className={`remote${showTimer ? " has-timer" : ""}`}>
      {offline}
      <header className="top">
        <h1>Hi {user.name}</h1>
        <button
          className="link"
          onClick={() => {
            writeSavedUser(null);
            setSavedUserId(null);
          }}
        >
          Not you?
        </button>
      </header>

      <div className="categories" role="tablist" aria-label="Workout type">
        {user.categories.map((c) => (
          <button
            key={c.id}
            role="tab"
            id={`tab-${c.id}`}
            aria-selected={c.id === category?.id}
            aria-controls="workouts"
            className="category"
            onClick={() => setPicked(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {category && (
        <section id="workouts" role="tabpanel" aria-labelledby={`tab-${category.id}`} className="workouts">
          <h2>{category.name}</h2>
          {category.workouts.length === 0 && <p className="empty">No workouts yet</p>}
          {category.workouts.map((w) => {
            const current = selection?.categoryId === category.id && selection.workoutId === w.id;
            return (
              <button
                key={w.id}
                className="workout"
                aria-current={current ? "true" : undefined}
                onClick={() => onSelect({ userId: user.id, categoryId: category.id, workoutId: w.id })}
              >
                <span>{w.name}</span>
                {current && <span className="badge">On screen</span>}
              </button>
            );
          })}
        </section>
      )}

      {showTimer && <TimerBar timer={timer} onTimer={onTimer} />}
    </main>
  );
}

export function Remote() {
  const { selection, timer, connected, select, sendTimer } = useGymSocket();
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () =>
      fetch("/api/config")
        .then((r) => r.json())
        .then((c: Config) => {
          if (!cancelled) setConfig(c);
        })
        .catch(() => {
          if (!cancelled) timer = setTimeout(load, CONFIG_RETRY_MS);
        });
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!config) return <main className="remote"><p>Loading…</p></main>;
  return <RemoteView config={config} selection={selection} onSelect={select} connected={connected} timer={timer} onTimer={sendTimer} />;
}
