# Gym Display and Phone Remote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A portrait gym display that shows whichever workout page a Node server names, controlled from an installable phone PWA, deployed behind the Thai app's nginx at `gym.learntoreadthai.co`.

**Architecture:** One Astro (static build) + React project. One Node process serves the built `dist/`, `GET /api/config`, and a WebSocket at `/ws`. The server holds one global selection, validates it against the repo config, persists it to a JSON file on a mounted volume, and broadcasts it to every connected client. The display (`/`) renders a workout component chosen from a registry; the phone (`/remote/`) is the PWA menu.

**Tech Stack:** Astro, `@astrojs/react`, React, TypeScript, `ws`, `tsx` (runs the server), Vitest, `@testing-library/react`, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-07-gym-display-design.md`

## Global Constraints

- Public host is `gym.learntoreadthai.co`; sockets are `wss://` there, so the client builds its URL from `location` (same origin, path `/ws`).
- The display is portrait, laid out for portrait directly, no CSS rotation; the layout scales to the viewport (no fixed pixel size). Target browser is Chromium on a Raspberry Pi.
- One shared display, one global selection; last pick wins. No authentication.
- The selection is `{ userId, categoryId, workoutId }`. The display shows only the workout page, with no user header.
- Workout pages are hand-built and identical for every user; the config is only an assignment list per user.
- Users and workouts live in a repo config file, no database. Last selection persists to a JSON file on a mounted volume.
- The phone saves the chosen user in `localStorage` after the first pick and offers a "not you?" link to change it. Routine use is category, then workout. The phone also listens to the socket and highlights the current workout.
- The gym container publishes no ports; nginx in the Thai repo (`learn-thai-webapp`) fronts it. Images are pushed to Docker Hub as `andrewt51/<app>:<tag>`.
- Out of scope: daily schedule, managing users/workouts on the phone, logging, data-driven workout rendering.
- The old static page, `.nojekyll`, `tests/check_dashboard.py` and the GitHub Pages README section are deleted.

## Review Focus

1. A `select` for a workout not assigned to that user is rejected and the selection is unchanged (Task 2, Task 4).
2. Garbage or non-JSON socket frames are ignored and the connection stays open (Task 2, Task 4).
3. A missing, empty or corrupt state file starts the server idle without crashing (Task 3).
4. A persisted selection whose workout was later removed from the config is treated as idle (Task 3).
5. The display's socket drops: it keeps showing the current page, reconnects, and resyncs to the server's current selection (Task 5).
6. The phone's saved user no longer exists in the config: it returns to the user picker (Task 7).

## File Structure

```
config/gym.config.json         users → categories → workouts (the editable config)
shared/config.ts               Config types, findWorkout, isSelectionAllowed
shared/protocol.ts             Selection, message types, parseClientMessage
server/store.ts                persisted selection store
server/app.ts                  createGymServer: static files, /api/config, /ws
server/main.ts                 reads env, starts the server
src/lib/useGymSocket.ts        reconnecting socket hook, returns current selection
src/workouts/registry.ts       workoutId → React component
src/workouts/StrengthA.tsx     portrait Strength A page (+ .css)
src/workouts/Placeholder.tsx   placeholder workout pages for the demo menu
src/components/Display.tsx     idle / registry lookup / fallback
src/components/Remote.tsx      phone menu
src/pages/index.astro          display route
src/pages/remote.astro         phone route
public/manifest.webmanifest, public/sw.js, public/icons/*
Dockerfile, .github/workflows/docker.yml
tests/**                       Vitest tests, mirroring the source layout
```

---

### Task 1: Restart the repo as an Astro + React project

**Files:**
- Delete: `index.html`, `styles.css`, `.nojekyll`, `tests/check_dashboard.py`
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/pages/index.astro` (placeholder), `.gitignore`
- Modify: `README.md` (rewrite: what it is, `npm run dev`, `npm test`, deploy pointer)

**Interfaces:**
- Produces: npm scripts `dev` (Astro dev on 4321 with `/ws` and `/api` proxied to `localhost:8080`, `ws: true`), `build` (`astro build` to `dist/`), `serve` (`tsx server/main.ts`), `test` (`vitest run`).

- [ ] **Step 1:** Save the old Strength A content for Task 6: `git show HEAD:index.html > /private/tmp/claude-501/-Users-andrewtrigg-Code-projects-gym/5e995999-717b-4fcb-bd6c-26215b46a5a2/scratchpad/old-index.html` and the same for `styles.css`.
- [ ] **Step 2:** Delete the old files; scaffold Astro with React integration, TypeScript strict, static output. Add `ws`, `tsx`, `vitest`, `@testing-library/react`, `jsdom` and their types.
- [ ] **Step 3:** Write `tests/smoke.test.ts` asserting `1 + 1 === 2`; run `npm test` → PASS (proves the runner works); delete the smoke test.
- [ ] **Step 4:** Run `npm run build` → exits 0 and `dist/index.html` exists.
- [ ] **Step 5:** Commit `chore: restart as Astro + React project`.

### Task 2: Shared config and protocol

**Files:**
- Create: `shared/config.ts`, `shared/protocol.ts`, `config/gym.config.json`
- Test: `tests/shared/config.test.ts`, `tests/shared/protocol.test.ts`

**Interfaces:**
- Produces (`shared/config.ts`):
  - `type Workout = { id: string; name: string }`
  - `type Category = { id: string; name: string; workouts: Workout[] }`
  - `type User = { id: string; name: string; categories: Category[] }`
  - `type Config = { users: User[] }`
  - `isSelectionAllowed(config: Config, s: Selection): boolean` — true only if the user has that category and that category lists that workout.
- Produces (`shared/protocol.ts`):
  - `type Selection = { userId: string; categoryId: string; workoutId: string }`
  - `type ClientMessage = { type: "select"; selection: Selection }`
  - `type ServerMessage = { type: "state"; selection: Selection | null }`
  - `parseClientMessage(raw: string): ClientMessage | null` — null for non-JSON, wrong shape, or non-string fields.
- `config/gym.config.json` seeds two users; one has category "Strength" with workout `strength-a` ("Strength A"); another category "Rehab" with `rehab-1` ("Rehab 1"); a "CrossFit" category with `crossfit-1`. Workout ids are the registry keys used in Task 5.

- [ ] **Step 1:** Write failing tests. `isSelectionAllowed` cases: assigned workout → true; workout exists but under a different user → false; unknown category → false; unknown user → false. `parseClientMessage` cases: valid select → object; `"not json"` → null; `{"type":"select"}` → null; `{"type":"select","selection":{"userId":1,...}}` → null; `{"type":"other"}` → null.
- [ ] **Step 2:** Run `npm test` → FAIL (modules missing).
- [ ] **Step 3:** Implement both modules to the signatures above.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: shared config types and socket protocol`.

### Task 3: Persisted selection store

**Files:**
- Create: `server/store.ts`
- Test: `tests/server/store.test.ts`

**Interfaces:**
- Consumes: `Config`, `isSelectionAllowed` from Task 2.
- Produces: `createSelectionStore(file: string, config: Config): { get(): Selection | null; set(s: Selection): void }`. `set` writes the file (creating its directory); the initial value is read from `file` at creation.

- [ ] **Step 1:** Write failing tests using a temp dir: new store with no file → `get()` is `null`; `set(s)` then a new store on the same file → `get()` equals `s`; empty file, `"{garbage"`, and a file containing `{"userId":1}` → `get()` is `null` and creation does not throw; a persisted selection whose workout is not in the config → `get()` is `null`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with synchronous `fs` calls; validate the loaded value with `isSelectionAllowed`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: persisted selection store`.

### Task 4: Server (static files, config endpoint, WebSocket)

**Files:**
- Create: `server/app.ts`, `server/main.ts`
- Test: `tests/server/app.test.ts`

**Interfaces:**
- Consumes: `createSelectionStore` (Task 3), `parseClientMessage` and `isSelectionAllowed` (Task 2).
- Produces: `createGymServer(opts: { config: Config; stateFile: string; staticDir: string }): import("node:http").Server`. Behaviour: `GET /api/config` → the config as JSON; other `GET`s → files from `staticDir` (directory paths serve `index.html`, unknown paths 404); WebSocket upgrade on `/ws`: on connect send `{type:"state", selection}`; on a valid allowed `select` update the store and broadcast the new `state` to all clients; ignore anything else. `main.ts` reads `PORT` (default 8080), `STATE_FILE` (default `./data/state.json`), `STATIC_DIR` (default `./dist`) and `config/gym.config.json`.

- [ ] **Step 1:** Write failing tests that start the server on port 0 with a temp state file and a small fixture config, using the real `ws` client: a new client receives `state` with `null`; client A sends an allowed select → clients A and B both receive that state; a select for a workout not assigned to that user → no broadcast and a new client still sees the previous state; sending `"garbage"` then an allowed select → the socket is still open and the select works; `GET /api/config` returns the fixture; a restarted server on the same state file sends the stored selection to a new client; `GET /` returns the fixture `index.html`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with `node:http` and `ws` (`noServer`, handle `upgrade` only for `/ws`). Guard static file paths against `..` traversal.
- [ ] **Step 4:** Run → PASS. Also run `npm run build && npm run serve` and `curl -s localhost:8080/api/config` returns the seed config.
- [ ] **Step 5:** Commit `feat: websocket server with persisted selection`.

### Task 5: Display client

**Files:**
- Create: `src/lib/useGymSocket.ts`, `src/workouts/registry.ts`, `src/workouts/Placeholder.tsx`, `src/components/Display.tsx`; replace `src/pages/index.astro`
- Test: `tests/client/useGymSocket.test.tsx`, `tests/client/Display.test.tsx`

**Interfaces:**
- Consumes: `Selection`, `ServerMessage` (Task 2).
- Produces:
  - `useGymSocket(): { selection: Selection | null; connected: boolean; select(s: Selection): void }` — connects to `ws(s)://${location.host}/ws`, applies each `state` message, reconnects with a capped backoff after close, and never clears `selection` on disconnect. The URL factory takes an injectable `WebSocket` constructor so tests can pass a fake.
  - `workoutRegistry: Record<string, React.ComponentType>` keyed by workout id (`strength-a`, `crossfit-1`, `rehab-1`); Task 6 adds the real Strength A entry.
  - `<Display />` — idle screen (gym name) when `selection` is null or its `workoutId` is not in the registry, otherwise the registered component.
- Astro mounts `<Display client:only="react" />` full viewport.

- [ ] **Step 1:** Write failing tests with a fake `WebSocket`: a `state` message sets `selection`; after the fake closes, `selection` is unchanged and a new socket is opened after the backoff (fake timers); the new socket's first `state` message replaces `selection`. `Display`: `null` → idle text present; `crossfit-1` → its placeholder renders; an unknown id → idle text, no throw.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the hook, registry with three placeholders, and `Display`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: display client with reconnecting socket`.

### Task 6: Strength A portrait page

**Files:**
- Create: `src/workouts/StrengthA.tsx`, `src/workouts/StrengthA.css`
- Modify: `src/workouts/registry.ts` (register `strength-a`)
- Test: `tests/client/StrengthA.test.tsx`

**Interfaces:**
- Consumes: `workoutRegistry` (Task 5).
- Produces: `StrengthA` component registered under `strength-a`.

- [ ] **Step 1:** Using the saved `old-index.html` and `old-styles.css` from Task 1, port the workout copy and slate colours into the component. Write a failing test that renders it and asserts each exercise name from the old page is present. The old checker `tests/check_dashboard.py` (in git history) lists the exact copy rules, such as no loads or rests; carry those over as assertions.
- [ ] **Step 2:** Run → FAIL, then implement as a single portrait column that sizes with viewport units/`clamp()`, no horizontal scroll, no animation.
- [ ] **Step 3:** Run → PASS.
- [ ] **Step 4:** Verify visually: `npm run build && npm run serve`, set the selection through a one-off `ws` script, and screenshot `/` in a browser at 1080×1920 and 720×1280; check no overflow or cut-off text at either size.
- [ ] **Step 5:** Commit `feat: Strength A portrait page`.

### Task 7: Phone PWA

**Files:**
- Create: `src/components/Remote.tsx`, `src/pages/remote.astro`, `public/manifest.webmanifest`, `public/sw.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Test: `tests/client/Remote.test.tsx`

**Interfaces:**
- Consumes: `useGymSocket` (Task 5, including `select`), `Config` (Task 2, fetched from `/api/config`).
- Produces: `<Remote />`. `localStorage` key `gym.userId`. Flow: no valid saved user → user list; saved user → category list → workout list; tapping a workout calls `select({ userId, categoryId, workoutId })`; the workout matching the current `selection` is marked `aria-current="true"`; a "Not you?" button clears the key and returns to the user list. The manifest has `start_url: "/remote/"`, `scope: "/remote/"`, `display: "standalone"`. `sw.js` caches the app shell only (never `/api/` or `/ws`).

- [ ] **Step 1:** Write failing tests with a mocked `fetch` and fake socket: first launch lists users; choosing a user stores `gym.userId` and shows that user's categories; a stored id that is not in the config → user list; "Not you?" clears the key; tapping a workout sends a `select` with the three ids; the workout equal to the socket's `selection` has `aria-current="true"`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `Remote` (large touch targets, mobile-first), the manifest, icons, and `sw.js`; register the service worker from `remote.astro`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Verify in a browser: open `/` and `/remote/` side by side against `npm run serve`; pick a workout on the remote and see the display change without reload; stop and restart the server and confirm the display shows the same workout after reconnect; in Chrome DevTools Application tab confirm the manifest is valid and the service worker is active.
- [ ] **Step 6:** Commit `feat: phone PWA remote`.

### Task 8: Docker image and CI

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `.github/workflows/docker.yml`

**Interfaces:**
- Produces: image `andrewt51/gym:<tag>` running `tsx server/main.ts` with `STATE_FILE=/data/state.json`, `STATIC_DIR=/app/dist`, `PORT=8080`, exposing no published port. Workflow runs `npm test` then builds and pushes `latest` and `${{ github.sha }}` tags, modelled on the Thai repo's `.github/workflows/prod.yml` (secrets `DOCKERHUB_TOKEN`, var `DOCKERHUB_USERNAME`).

- [ ] **Step 1:** Write the multi-stage Dockerfile (build stage runs `npm ci && npm run build`; runtime stage installs production dependencies plus `tsx`, copies `dist`, `server`, `shared`, `config`).
- [ ] **Step 2:** Verify: `docker build -t gym-test . && docker run --rm -p 8080:8080 -v gym-data:/data gym-test`, then `curl localhost:8080/api/config` returns the config and, after sending a select with a `ws` script and restarting the container with the same volume, a new client receives the stored selection.
- [ ] **Step 3:** Write the workflow.
- [ ] **Step 4:** Commit `build: docker image and CI workflow`.

### Task 9: Thai repo changes (separate repo, separate branch)

**Files (in `~/Code/projects/learn-thai-webapp`):**
- Modify: `docker-compose.yml`, `nginx-templates/default.conf.template`, `init-letsencrypt.sh`, `readme.md`

**Interfaces:**
- Consumes: image `andrewt51/gym:${GYM_TAG}` (Task 8).
- Produces: a `gym` compose service on the shared network with a named volume `gym-data` mounted at `/data`; an nginx `server` block for `${GYM_SERVER_NAME}` (default `gym.learntoreadthai.co`) with port 80 redirect plus `.well-known/acme-challenge`, and a 443 block that proxies `/` to `http://gym:8080` with `proxy_http_version 1.1`, `Upgrade $http_upgrade`, `Connection "upgrade"`, `Host`, `X-Forwarded-*`, and a long `proxy_read_timeout` (e.g. `3600s`) so idle sockets stay open; `init-letsencrypt.sh` requests a certificate for both `SERVER_NAME` and `GYM_SERVER_NAME`. The Thai server block's existing behaviour is unchanged.

- [ ] **Step 1:** In the Thai repo, branch `gym-service`. Make the compose, nginx and certbot-script edits.
- [ ] **Step 2:** Verify nginx config parses: run the nginx image's `nginx -t` against the rendered template with test env values (`docker run --rm -v ... nginx:1.25.3 nginx -t`), accepting only the missing-cert-file error if certs are absent, and `docker compose config` renders without error.
- [ ] **Step 3:** Document in the Thai `readme.md`: create the DNS A record for `gym.learntoreadthai.co` pointing at the droplet, re-run `init-letsencrypt.sh` once it resolves, set `GYM_TAG` and `GYM_SERVER_NAME` in `.env`, then `docker compose pull && docker compose up -d`.
- [ ] **Step 4:** Commit `feat: add gym service behind nginx`. Do not push or deploy; the user does that.

### Task 10: End-to-end check and cleanup

**Files:**
- Modify: `README.md` (final run/deploy instructions)

- [ ] **Step 1:** From a clean checkout run `npm ci && npm test && npm run build` → all pass.
- [ ] **Step 2:** Run the built Docker image locally and walk the full flow in a browser at a portrait viewport: fresh phone (empty `localStorage`) → pick user → category → workout → display changes; reload the display → same page; stop the server, confirm the display stays on the page, restart it, confirm the display resyncs; on the phone use "Not you?" and pick another user.
- [ ] **Step 3:** Confirm `git ls-files` contains none of the deleted static files, and the README documents local dev, config editing, and the deploy order (build image → Thai repo changes → DNS → certificate → compose up).
- [ ] **Step 4:** Commit `docs: final README`.
