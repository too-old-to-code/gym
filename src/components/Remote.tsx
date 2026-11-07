import { useEffect, useState } from "react";
import type { Config } from "../../shared/config";
import type { Selection } from "../../shared/protocol";
import { useGymSocket } from "../lib/useGymSocket";
import "./Remote.css";

const USER_KEY = "gym.userId";

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

type ViewProps = { config: Config; selection: Selection | null; onSelect: (s: Selection) => void };

export function RemoteView({ config, selection, onSelect }: ViewProps) {
  const [savedUserId, setSavedUserId] = useState<string | null>(readSavedUser);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const user = config.users.find((u) => u.id === savedUserId);
  const category = user?.categories.find((c) => c.id === categoryId);

  if (!user) {
    return (
      <main className="remote">
        <h1>Who are you?</h1>
        {config.users.map((u) => (
          <button
            key={u.id}
            onClick={() => {
              writeSavedUser(u.id);
              setSavedUserId(u.id);
            }}
          >
            {u.name}
          </button>
        ))}
      </main>
    );
  }

  const notYou = (
    <button
      className="link"
      onClick={() => {
        writeSavedUser(null);
        setSavedUserId(null);
        setCategoryId(null);
      }}
    >
      Not you?
    </button>
  );

  if (!category) {
    return (
      <main className="remote">
        <h1>{user.name}</h1>
        {user.categories.map((c) => (
          <button key={c.id} onClick={() => setCategoryId(c.id)}>
            {c.name}
          </button>
        ))}
        {notYou}
      </main>
    );
  }

  return (
    <main className="remote">
      <h1>{category.name}</h1>
      {category.workouts.map((w) => {
        const current = selection?.categoryId === category.id && selection.workoutId === w.id;
        return (
          <button
            key={w.id}
            aria-current={current ? "true" : undefined}
            onClick={() => onSelect({ userId: user.id, categoryId: category.id, workoutId: w.id })}
          >
            {w.name}
          </button>
        );
      })}
      <button className="link" onClick={() => setCategoryId(null)}>
        Back
      </button>
      {notYou}
    </main>
  );
}

export function Remote() {
  const { selection, select } = useGymSocket();
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  if (!config) return <main className="remote"><p>Loading…</p></main>;
  return <RemoteView config={config} selection={selection} onSelect={select} />;
}
