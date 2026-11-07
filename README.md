# gym

A portrait gym display that shows whichever workout page the server names, plus a phone PWA used as the remote.

Design: `docs/superpowers/specs/2026-11-07-gym-display-design.md`. Plan: `docs/superpowers/plans/2026-11-07-gym-display.md`.

## Develop

```bash
npm install
npm run build && npm run serve   # server on :8080 serving dist/ and /ws
npm run dev                      # Astro dev on :4321, proxying /ws and /api to :8080
npm test
```

Users and workouts live in `config/gym.config.json`.
