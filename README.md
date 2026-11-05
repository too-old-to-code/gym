# gym

Static Strength A display for the GitHub Pages project site.

The page is `index.html` at the repository root, with `styles.css` beside it. There is no build step and no app server. The original canvas is not part of this repository.

## Preview

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/`.

## Checks

```bash
python3 tests/check_dashboard.py
```

The script checks the workout copy, slate colors, relative asset path, and the absence of loads, rests, scripts, and animation. When Google Chrome is installed it also renders `1920×1080`, `1512×982`, `1366×768`, and `1440×810` side by side, plus stacked `390×844` and `360×740`.

## GitHub Pages

Expected project URL: https://too-old-to-code.github.io/gym/

Pages is not enabled yet. Files stay at the repository root so that URL serves this page, not a nested `/gym/gym/` path. Styles use a relative `styles.css` link for the same reason.

After review and an authorised merge to `main`, enable Pages:

1. Repository Settings → Pages.
2. Build and deployment → Deploy from a branch.
3. Branch `main`, folder `/ (root)`, then save.

Do not add a custom domain. No DNS change is required. The live page is then https://too-old-to-code.github.io/gym/
