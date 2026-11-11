# gym

Static training-day displays for the GitHub Pages project site.

Strength A stays at `index.html`. The other boards are separate pages beside it: Strength B, Garage 1–6, Norwegian 4×4, and Tabata rowing. There is no build step and no app server. Links between days are relative, so the project site serves them under `/gym/`.

## Preview

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/`.

## Checks

```bash
python3 tests/check_dashboard.py
python3 tests/check_days.py
python3 tests/check_firebase.py
```

The script checks the workout copy, slate colors, relative asset path, and the absence of loads, rests, scripts, and animation. When Google Chrome is installed it also renders side-by-side `1920×1080`, `1512×982`, `1366×768`, `1440×810`, `901×1080`, `1024×1366`, and `901×768`, plus stacked `390×844` and `360×740`.

## GitHub Pages

Expected project URL: https://too-old-to-code.github.io/gym/

Pages already serves `main` from the repository root at that URL. This set of day pages is not live until an authorised merge. No custom domain and no DNS change are required.

## Firebase app

`firebase-init.js` loads the pinned official browser module `https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js` and calls `initializeApp` with the public web config for `gym-dashboard-a8ae3`. That config is not an admin credential. Each board includes it with `<script type="module" src="firebase-init.js"></script>`, a relative path so it resolves under `/gym/`.

The script records only whether the Firebase app object was created. The config includes `databaseURL` `https://gym-dashboard-a8ae3-default-rtdb.europe-west1.firebasedatabase.app`. The script does not import the Database SDK, open a listener, read, or write. Realtime stays `configured-not-connected`. If the SDK cannot be loaded, the boards still render and the app is marked unavailable.

A remote workout selector or live board still needs all of the following before it can work:

1. Code that imports the Database SDK and attaches a listener. That code is not here.
2. A chosen authorised Auth or access model for who may select a workout.
3. Secure Realtime Database rules for that model. Rules must not be left open.

No Firebase console change is made from this repository.
