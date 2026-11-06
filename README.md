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
```

The script checks the workout copy, slate colors, relative asset path, and the absence of loads, rests, scripts, and animation. When Google Chrome is installed it also renders side-by-side `1920×1080`, `1512×982`, `1366×768`, `1440×810`, `901×1080`, `1024×1366`, and `901×768`, plus stacked `390×844` and `360×740`.

## GitHub Pages

Expected project URL: https://too-old-to-code.github.io/gym/

Pages already serves `main` from the repository root at that URL. This set of day pages is not live until an authorised merge. No custom domain and no DNS change are required.
