# Gym display and phone remote: design

## Intent

A screen on the gym wall shows the workout of the day. People in the gym
choose what it shows from their phones. The screen is a portrait display of
hand-built workout pages. The phone is a remote: it picks a user, a workout
category and a workout, and the screen changes to that workout's page.

This replaces the current static Strength A page (plain HTML/CSS for GitHub
Pages). That code stays in git history; the repo is restarted as an Astro +
React project.

## Goals

- A portrait-orientation display that shows one workout page at a time and
  changes page when the server says so, with no reload by a person.
- A phone PWA, installable to the home screen. On first launch the person
  picks their user, and the choice is saved in the phone's local storage so
  they are not asked again. After that the menu is two steps: category
  (Strength, CrossFit-style, Rehab and so on), then a workout (a number or
  name).
- Per-user workout lists: each user sees only the workouts assigned to them.
- The display shows the last workout picked, including after a server
  restart or a display reload.
- Deployed as one more service in the Thai app's docker compose on the
  existing DigitalOcean droplet, at `gym.learntoreadthai.co`.

## Non-goals

- A daily schedule that changes the workout automatically. This is a later
  idea; nothing in this build should block it, but nothing should implement it.
- Managing users or workouts from the phone. They are edited in a config file.
- Logging workouts, tracking weights, timers, or any data entered on the
  phone. The phone is only a remote.
- Data-driven workout rendering. Each workout is a hand-built page. A shared
  template for the strength workouts is possible but optional.
- Building any workout other than Strength A (reworked for portrait). A
  couple of placeholder workouts under other categories are enough to prove
  the menu.

## Anti-goals

- A display that goes blank or shows an error when the socket drops. It keeps
  showing the current page and reconnects quietly.
- A second paid DigitalOcean instance.
- Changes to the Thai app's behaviour. Edits to its repo are small and
  additive.

## How it works

**Display.** An Astro site with React where interactivity is needed. A client
component opens a WebSocket to the server and renders the page the server
names. The workout pages are Astro/React pages designed for portrait. On
first load the display asks for the current selection and shows it.

**Phone app.** A separate route of the same site, installable as a PWA
(manifest, icons, service worker). It reads the user/category/workout config
from the server, walks the user through the three steps, and sends the choice
to the server over the socket.

**Server.** One Node process. It serves the built Astro site, runs the
WebSocket endpoint, and holds the current selection. It broadcasts the
selection to every connected display when it changes. It writes the current
selection to a small file in a mounted volume and reads it at startup.

**Config.** A file in the repo lists users, and for each user the categories
and workouts (each workout maps to a page). Changing it means redeploying.

## Constraints

- No login. Anyone who can reach the URL can pick any user.
- HTTPS is required: the PWA only installs over HTTPS and the socket must be
  `wss://`.
- The Thai app owns ports 80/443 through an nginx reverse proxy with certbot
  (Thai repo: `learn-thai-webapp`, with `docker-compose.yml`,
  `nginx-templates/default.conf.template`, `init-letsencrypt.sh`). The gym
  container publishes no ports and sits behind that proxy.
- Images follow the existing flow: built in GitHub Actions, pushed to Docker
  Hub as `andrewt51/<app>:<tag>`, pulled on the droplet.

## Decisions

Made by the user:
- Portrait display; phone remote as a PWA; one shared display with one
  global selection (whoever picks last wins).
- The user is chosen once on the phone and remembered in local storage;
  routine use is category, then workout.
- The existing static page and its GitHub Pages setup are deleted.
- Workout pages are the same for every user. The per-user config is only an
  assignment list of which workouts each user can pick; pages take no
  per-user parameters.
- The display is a Raspberry Pi connected to a monitor, with the physical
  monitor rotated to portrait. The page is laid out for portrait directly,
  with no CSS rotation. Pixel size is not fixed, so the layout must scale to
  the viewport.
- The plan includes the Thai repo changes (compose service, nginx server
  block with WebSocket headers, certbot for the new hostname) as a separate
  change in that repo. The user does the final deploy. DNS for
  `gym.learntoreadthai.co` does not exist yet, so the user must create it
  and the first certificate can't be issued until it resolves.
- Config file in the repo for users and workouts.
- Display remembers the last pick.
- Hosted in the Thai app's compose on the existing droplet, nginx in front,
  at `gym.learntoreadthai.co`.
- Schedule is deferred.

My calls (the builder may revisit if there is a good reason):
- One Astro project and one Node server, serving everything, so the compose
  service is a single container with no database.
- Last pick persisted as a small JSON file in a mounted volume.
- No authentication.
- The phone offers a way to change the saved user (for example a small
  "not you?" link), since local storage can hold only one.
- The selection carries user, category and workout. The display shows just
  the workout page, with no user header.
- The phone also listens to the socket, so its menu highlights what is
  currently on the screen.
- Idle state shown when nothing has ever been picked: a plain screen with the
  gym name.
- Edits to the Thai repo (new compose service, a second nginx `server` block
  with WebSocket upgrade headers, certbot for the second hostname) are made
  as a separate change in that repo.

## Left to the builder

- Astro adapter and WebSocket library, message format, reconnect behaviour.
- How the display handles a selection naming a page that does not exist.
- PWA icons, naming, and visual design of the phone menu.
- Portrait layout details for Strength A, using the existing page's content
  and slate look as the starting point.
- Dockerfile, GitHub Actions workflow, and how the volume is mounted.
- Test approach.
