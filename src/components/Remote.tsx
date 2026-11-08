import { useEffect, useState, type CSSProperties } from "react";
import type { Config } from "../../shared/config";
import type { Selection } from "../../shared/protocol";
import { useGymSocket } from "../lib/useGymSocket";
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

type ViewProps = { config: Config; selection: Selection | null; onSelect: (s: Selection) => void; connected?: boolean };

// Bright accent per section; unknown sections cycle through the same palette.
const ACCENTS: Record<string, string> = { strength: "#22d3ee", crossfit: "#fb923c", rehab: "#4ade80" };
const FALLBACK_ACCENTS = ["#a78bfa", "#f472b6", "#facc15", "#60a5fa"];
const accentFor = (id: string, index: number) => ACCENTS[id] ?? FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length];
const USER_ACCENTS = ["#22d3ee", "#fb923c", "#4ade80", "#a78bfa", "#f472b6", "#facc15"];

export function RemoteView({ config, selection, onSelect, connected = true }: ViewProps) {
  const [savedUserId, setSavedUserId] = useState<string | null>(readSavedUser);
  // undefined: follow what is on the screen; null: everything closed; string: that section is open.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);

  const user = config.users.find((u) => u.id === savedUserId);

  const offline = connected ? null : <p className="offline">Reconnecting…</p>;

  if (!user) {
    return (
      <main className="remote">
        {offline}
        <h1>Who are you?</h1>
        <div className="people">
          {config.users.map((u, i) => (
            <button
              key={u.id}
              className="person"
              style={{ "--accent": USER_ACCENTS[i % USER_ACCENTS.length] } as CSSProperties}
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
  const openId = picked === undefined ? (onScreen ?? user.categories[0])?.id ?? null : picked;

  return (
    <main className="remote">
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

      <div className="sections">
        {user.categories.map((c, i) => {
          const open = c.id === openId;
          const panelId = `panel-${c.id}`;
          return (
            <section
              key={c.id}
              className={`section${open ? " open" : ""}`}
              style={{ "--accent": accentFor(c.id, i) } as CSSProperties}
            >
              <h2>
                <button
                  className="section-head"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setPicked(open ? null : c.id)}
                >
                  <span>{c.name}</span>
                  <span className="chevron" aria-hidden="true" />
                </button>
              </h2>
              {open && (
                <div id={panelId} className="panel">
                  {c.workouts.map((w) => {
                    const current = selection?.categoryId === c.id && selection.workoutId === w.id;
                    return (
                      <button
                        key={w.id}
                        className="workout"
                        aria-current={current ? "true" : undefined}
                        onClick={() => onSelect({ userId: user.id, categoryId: c.id, workoutId: w.id })}
                      >
                        <span>{w.name}</span>
                        {current && <span className="badge">On screen</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

export function Remote() {
  const { selection, connected, select } = useGymSocket();
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
  return <RemoteView config={config} selection={selection} onSelect={select} connected={connected} />;
}
