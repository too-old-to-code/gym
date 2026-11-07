# gym

A portrait gym display that shows whichever workout page the server names, plus a phone PWA used as the remote.

- Display: `/` (Astro + React). Opens a WebSocket to `/ws` and renders the page for the current selection.
- Remote: `/remote/` (installable PWA). Pick a user once (saved on the phone), then category, then workout.
- Server: one Node process (`server/`) that serves `dist/`, `GET /api/config` and the `/ws` socket, and saves the last pick to `STATE_FILE`.

Design: `docs/superpowers/specs/2026-11-07-gym-display-design.md`. Plan: `docs/superpowers/plans/2026-11-07-gym-display.md`.

## Develop

```bash
npm install
npm run build && npm run serve   # server on :8080 serving dist/ and /ws
npm run dev                      # Astro dev on :4321, proxying /ws and /api to :8080
npm test
```

Environment for `npm run serve`: `PORT` (8080), `STATE_FILE` (`./data/state.json`), `STATIC_DIR` (`./dist`).

## Add a user or workout

1. Edit `config/gym.config.json`: users, their categories, and the workouts under each. A workout `id` must match a key in `src/workouts/registry.ts`.
2. For a new workout, add a React component in `src/workouts/` and register it under its `id`. Pages are hand-built and the same for every user.
3. Push to `main` and redeploy.

## Deploy

Pushing to `main` runs tests, then builds and pushes `andrewt51/gym` (`latest` and the commit SHA) to Docker Hub. The container publishes no port and keeps its saved selection in the `/data` volume.

It runs as the `gym` service in the Thai app's compose file (`learn-thai-webapp`, branch `gym-service`), behind its nginx at `gym.learntoreadthai.co`. Order matters, because nginx stops without the certificate: create the DNS record, issue the certificate with `./init-letsencrypt.sh gym.learntoreadthai.co`, then deploy the Thai branch. Details are in that repo's readme.

The workflow needs the repo variable `DOCKERHUB_USERNAME` and the secret `DOCKERHUB_TOKEN`.
