#!/usr/bin/env python3
"""Exact-content and 1920x1080 checks for the other training-day boards."""

from __future__ import annotations

import importlib.util
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("check_dashboard", ROOT / "tests" / "check_dashboard.py")
dash = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(dash)

LINKS = [
    ("index.html", "Strength A"),
    ("garage-1.html", "Garage 1"),
    ("garage-2.html", "Garage 2"),
    ("strength-b.html", "Strength B"),
    ("garage-3.html", "Garage 3"),
    ("norwegian-4x4.html", "Norwegian 4×4"),
    ("garage-4.html", "Garage 4"),
    ("garage-5.html", "Garage 5"),
    ("garage-6.html", "Garage 6"),
    ("tabata-rowing.html", "Tabata"),
]

G5 = [
    "50 cal row",
    "40 walking lunges",
    "30 kettlebell swings",
    "20 ring dips",
    "10 sandbag cleans",
    "Then back down",
    "10 sandbag cleans",
    "20 ring dips",
    "30 kettlebell swings",
    "40 walking lunges",
    "50 cal row",
]

NORWEGIAN = [
    "10 min easy jog",
    "4 min hard",
    "3 min easy jog",
    "4 min hard",
    "3 min easy jog",
    "4 min hard",
    "3 min easy jog",
    "4 min hard",
    "Cool-down, 5 min easy",
]


def fail(errors: list[str]) -> None:
    print("\n".join(errors))
    raise SystemExit(1)


def text_of(path: pathlib.Path) -> str:
    return dash.visible_text(path.read_text(encoding="utf-8"))


def find_seq(text: str, parts: list[str]) -> list[int]:
    positions = []
    cursor = 0
    for part in parts:
        found = text.find(part, cursor)
        positions.append(found)
        if found >= 0:
            cursor = found + len(part)
    return positions


def check_content() -> None:
    errors: list[str] = []
    pages = {name: (ROOT / name).read_text(encoding="utf-8") for name, _label in LINKS}
    for name, html in pages.items():
        if re.search(r"""(?:href|src)\s*=\s*["']/(?!/)""", html):
            errors.append(f"{name}: root-absolute path")
        if "<base" in html.lower() or "/gym/gym" in html:
            errors.append(f"{name}: base path would miss /gym/")
        if re.search(r"https?://", html, flags=re.I):
            errors.append(f"{name}: remote URL")
        if re.search(r"<script\b|@keyframes|animation\s*:|transition\s*:", html, flags=re.I):
            errors.append(f"{name}: script or animation")
        for token in ("<button", "<input", "<form"):
            if token in html.lower():
                errors.append(f"{name}: control {token}")
        for href, _label in LINKS:
            if f'href="{href}"' not in html:
                errors.append(f"{name}: missing link {href}")
        if re.search(r"\b(?:Oct|Nov|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b", dash.visible_text(html)):
            errors.append(f"{name}: historical date or weekday")
        if re.search(r"\b(?:kg|lbs?|rpe|1rm|tempo)\b", dash.visible_text(html), flags=re.I):
            errors.append(f"{name}: invented load or tempo")

    strength_b = text_of(ROOT / "strength-b.html")
    for part in [
        "Strength B",
        "10 min easy row or bike, hip openers.",
        "Deadlifts",
        "Bench press",
        "Weighted pull-ups",
        "Leg extensions",
        "Nordics",
    ]:
        if part not in strength_b:
            errors.append(f"strength-b missing {part}")
    if strength_b.count("3×8") != 4 or strength_b.count("3×6") != 1:
        errors.append("strength-b sets do not match 3×8 and 3×6")
    if "banded glute" in strength_b.lower():
        errors.append("strength-b warmup must not add banded glutes")

    garage_warmup = "Easy row or bike, hip openers, banded glute work."
    limits = "No barbell overhead lifts, box jumps, wall balls or muscle-ups."
    for number in range(1, 7):
        body = text_of(ROOT / f"garage-{number}.html")
        for part in (f"Garage {number}", garage_warmup, "About 60 to 75 minutes.", limits):
            if part not in body:
                errors.append(f"garage-{number} missing {part}")
        if "100 min" in body or "Absolute max" in body:
            errors.append(f"garage-{number} adds a cap the plan does not state")

    g1 = text_of(ROOT / "garage-1.html")
    g1_seq = find_seq(
        g1,
        [
            "Front-rack sandbag squats to a box, 5 x 5.",
            "Conditioning, 20 min AMRAP",
            "15 cal row",
            "15 kettlebell swings",
            "10 ring rows",
            "30 double-unders",
        ],
    )
    if any(pos < 0 for pos in g1_seq) or g1_seq != sorted(g1_seq):
        errors.append(f"garage-1 order {g1_seq}")
    amrap = re.search(r'<section id="amrap".*?</section>', pages["garage-1.html"], flags=re.S)
    if amrap is None or "5 x 5" in amrap.group(0) or amrap.group(0).count("15 cal row") != 1:
        errors.append("garage-1 AMRAP cycle includes the strength sets or drops a station")

    g2 = text_of(ROOT / "garage-2.html")
    g2_seq = find_seq(
        g2,
        [
            "Romanian deadlifts 4 x 8, then 3 x 10 on the hyper.",
            "Conditioning, 5 rounds for time",
            "400m row",
            "12 dumbbell thrusters (shallow catch)",
            "8 box burpees",
        ],
    )
    if any(pos < 0 for pos in g2_seq) or g2_seq != sorted(g2_seq):
        errors.append(f"garage-2 order {g2_seq}")
    if pages["garage-2.html"].count('class="lap"') != 5:
        errors.append("garage-2 is not five finite rounds")

    g3 = text_of(ROOT / "garage-3.html")
    g3_seq = find_seq(
        g3,
        [
            "Weighted ring dips, 4 x 6.",
            "Conditioning, 24 min EMOM",
            "Rotate each minute: 12 cal bike, 10 sandbag cleans, 40m sandbag carry, rest.",
            "12 cal bike",
            "10 sandbag cleans",
            "40m sandbag carry",
            "Rest",
        ],
    )
    if any(pos < 0 for pos in g3_seq) or g3_seq != sorted(g3_seq):
        errors.append(f"garage-3 order {g3_seq}")
    if len(re.findall(r'class="quad\b', pages["garage-3.html"])) != 4 or pages["garage-3.html"].count(">Rest<") != 1:
        errors.append("garage-3 wheel is missing a full rest station")

    g4 = text_of(ROOT / "garage-4.html")
    if "Kettlebell swings, pull-ups, box burpees, then 10 min steady on the bike." not in g4:
        errors.append("garage-4 missing the 21-15-9 sentence")
    g4_seq = find_seq(g4, ["Pendlay rows, 5 x 5.", "Conditioning, 21-15-9", "21", "15", "9", "10 min steady on the bike."])
    if any(pos < 0 for pos in g4_seq) or g4_seq != sorted(g4_seq):
        errors.append(f"garage-4 order {g4_seq}")

    g5 = text_of(ROOT / "garage-5.html")
    g5_seq = find_seq(g5, G5)
    if any(pos < 0 for pos in g5_seq) or g5_seq != sorted(g5_seq):
        errors.append(f"garage-5 turnaround order {g5_seq}")
    if g5.count("10 sandbag cleans") != 2 or g5.count("50 cal row") != 2 or pages["garage-5.html"].count('class="clean"') != 2:
        errors.append("garage-5 collapsed a repeated station")

    g6 = text_of(ROOT / "garage-6.html")
    g6_seq = find_seq(
        g6,
        [
            "Single-leg dumbbell RDLs, 3 x 10 per side.",
            "8 rounds of 1 min hard, 1 min easy.",
            "1 min hard",
            "1 min easy",
            "Finisher, 3 rounds",
            "20 double-unders",
            "10 dumbbell snatches to the shoulder (no overhead)",
            "10 ring rows",
        ],
    )
    if any(pos < 0 for pos in g6_seq) or g6_seq != sorted(g6_seq):
        errors.append(f"garage-6 order {g6_seq}")
    bands = re.findall(r'<div class="pair-band">(.*?)</div>', pages["garage-6.html"], flags=re.S)
    if len(bands) != 8 or any("1 min hard" not in band or "1 min easy" not in band or "× 8" in band for band in bands):
        errors.append("garage-6 repeat does not cover each hard and easy pair")
    if "× 8" in pages["garage-6.html"]:
        errors.append("garage-6 multiplies eight drawn pairs again")

    norwegian = text_of(ROOT / "norwegian-4x4.html")
    n_seq = find_seq(norwegian, NORWEGIAN)
    if any(pos < 0 for pos in n_seq) or n_seq != sorted(n_seq):
        errors.append(f"norwegian interval order {n_seq}")
    if pages["norwegian-4x4.html"].count('class="seg hard"') != 4 or pages["norwegian-4x4.html"].count('class="seg easy"') != 3 or pages["norwegian-4x4.html"].count('class="seg cool"') != 1:
        errors.append("norwegian duration bands are not 4 hard, 3 easy, 1 cool-down")
    if "3 min easy jog between each hard interval." not in norwegian:
        errors.append("norwegian missing the between-interval boundary")
    if "85 to 95% of max heart rate, heavy but steady breathing." not in norwegian:
        errors.append("norwegian missing heart-rate detail")

    tabata = text_of(ROOT / "tabata-rowing.html")
    t_seq = find_seq(
        tabata,
        [
            "10 min easy row with a few short pick-ups.",
            "8 rounds of 20 s all-out, 10 s rest",
            "3 min easy rowing",
            "8 rounds of 20 s all-out, 10 s rest",
            "3 min easy rowing",
            "8 rounds of 20 s all-out, 10 s rest",
            "Cool-down, 5 to 10 min easy row or bike",
        ],
    )
    if any(pos < 0 for pos in t_seq) or t_seq != sorted(t_seq):
        errors.append(f"tabata order {t_seq}")
    if pages["tabata-rowing.html"].count("nest-block") != 3 or pages["tabata-rowing.html"].count("nest-between") != 2:
        errors.append("tabata nesting is not 3 blocks and 2 between-block recoveries")
    if pages["tabata-rowing.html"].count('class="tick"') != 24:
        errors.append("tabata blocks do not each contain 8 rounds")
    if "10 s rest stays inside each round. 3 min easy rowing is only between blocks." not in tabata:
        errors.append("tabata missing the recovery boundary")

    if errors:
        fail(errors)
    print("days content: ok")


LAYOUT_JS = r"""
(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const outside = [];
  const overflow = [];
  const nodes = document.querySelectorAll("h1,h2,h3,p,a,li,.gd-stat,.gd-score,.gd-nav,.gd-board,.gd-sq,.gd-left,.stage");
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 && rect.height < 1) continue;
    if (rect.left < -1 || rect.top < -1 || rect.right > vw + 1 || rect.bottom > vh + 1) {
      outside.push({
        text: (el.innerText || el.textContent || "").replace(/\s+/g, " ").slice(0, 70),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        right: Math.round(rect.right)
      });
    }
    if (el.scrollWidth > el.clientWidth + 2) {
      overflow.push({
        text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 70),
        sw: el.scrollWidth,
        cw: el.clientWidth
      });
    }
  }
  const leftEl = document.querySelector(".gd-left");
  const panelEl = document.querySelector(".gd-sq, .gd-board");
  const left = leftEl ? leftEl.getBoundingClientRect() : null;
  const panel = panelEl ? panelEl.getBoundingClientRect() : null;
  return {
    innerWidth: vw,
    innerHeight: vh,
    docScrollWidth: document.documentElement.scrollWidth,
    docScrollHeight: document.documentElement.scrollHeight,
    sideBySide: !!(left && panel && panel.left >= left.right - 2),
    panel: panel ? { w: Math.round(panel.width), h: Math.round(panel.height) } : { w: 0, h: 0 },
    outside: outside.slice(0, 8),
    overflow: overflow.slice(0, 8),
    cycle: (() => {
      const nodes = [...document.querySelectorAll("#amrap .spoke")];
      if (!nodes.length) return null;
      const boxes = nodes.map((el) => {
        const rect = el.getBoundingClientRect();
        return { step: el.dataset.step, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
      const cx = boxes.reduce((sum, box) => sum + box.x, 0) / boxes.length;
      const cy = boxes.reduce((sum, box) => sum + box.y, 0) / boxes.length;
      const order = boxes
        .map((box) => {
          const angle = Math.atan2(box.x - cx, -(box.y - cy));
          return { step: box.step, angle: angle < 0 ? angle + Math.PI * 2 : angle };
        })
        .sort((a, b) => a.angle - b.angle)
        .map((box) => box.step);
      return order;
    })(),
    rest: (() => {
      const label = document.querySelector(".quad.q4 strong");
      const wheel = document.querySelector(".wheel");
      if (!label || !wheel) return null;
      const text = label.getBoundingClientRect();
      const clock = wheel.getBoundingClientRect();
      return {
        text: label.textContent,
        width: Math.round(text.width),
        right: Math.round(text.right),
        left: Math.round(text.left),
        mid: Math.round(clock.left + clock.width / 2)
      };
    })()
  };
})()
"""


def check_layout(shot_dir: pathlib.Path | None) -> None:
    chrome = dash.shutil.which("google-chrome") or dash.shutil.which("google-chrome-stable")
    if not chrome:
        print("days layout: skipped, Chrome is not installed")
        return
    server, http_port = dash.start_server()
    debug_sock = dash.socket.socket()
    debug_sock.bind(("127.0.0.1", 0))
    debug_port = debug_sock.getsockname()[1]
    debug_sock.close()
    profile = pathlib.Path(f"/tmp/gym-days-chrome-{debug_port}")
    dash.shutil.rmtree(profile, ignore_errors=True)
    process = dash.start_chrome(debug_port, profile)
    errors: list[str] = []
    try:
        browser = dash.WebSocket(dash.debugger_url(debug_port))
        page = dash.open_page(browser, f"http://127.0.0.1:{http_port}/index.html")
        for name, _label in LINKS:
            page.call(
                "Emulation.setDeviceMetricsOverride",
                {"width": 1920, "height": 1080, "deviceScaleFactor": 1, "mobile": False},
            )
            page.call("Page.navigate", {"url": f"http://127.0.0.1:{http_port}/{name}"})
            dash.wait_ready(page)
            result = page.call("Runtime.evaluate", {"expression": LAYOUT_JS, "returnByValue": True})
            report = result.get("result", {}).get("value")
            if not isinstance(report, dict):
                errors.append(f"{name}: layout script failed {result}")
                continue
            print(
                f"1920 {name}: side={report['sideBySide']} panel={report['panel']['w']}x{report['panel']['h']} "
                f"scroll={report['docScrollWidth']}x{report['docScrollHeight']} "
                f"outside={len(report['outside'])} overflow={len(report['overflow'])}"
            )
            if report["docScrollWidth"] > 1921 or report["docScrollHeight"] > 1081:
                errors.append(f"{name}: document {report['docScrollWidth']}x{report['docScrollHeight']}")
            if name == "index.html":
                if not report["sideBySide"]:
                    errors.append(f"{name}: not side by side")
                if abs(report["panel"]["w"] - report["panel"]["h"]) > 2:
                    errors.append(f"{name}: panel not square {report['panel']}")
            if name == "garage-1.html" and report.get("cycle") != ["row", "swings", "rings", "du"]:
                errors.append(f"garage-1 clockwise order is {report.get('cycle')}")
            if name == "garage-3.html":
                rest = report.get("rest") or {}
                if rest.get("text") != "Rest" or rest.get("width", 0) < 36 or rest.get("right", 0) >= rest.get("mid", 0) - 8:
                    errors.append(f"garage-3 rest minute is clipped or on the clock stroke {rest}")
            if report["outside"]:
                errors.append(f"{name}: outside {json.dumps(report['outside'])}")
            if report["overflow"]:
                errors.append(f"{name}: text overflow {json.dumps(report['overflow'])}")
            if shot_dir:
                shot_dir.mkdir(parents=True, exist_ok=True)
                data = dash.screenshot(page)
                (shot_dir / f"{name.replace('.html', '')}-1920.png").write_bytes(data)
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except dash.subprocess.TimeoutExpired:
            process.kill()
        server.shutdown()
        dash.shutil.rmtree(profile, ignore_errors=True)
    if errors:
        fail(errors)
    print("days layout: ok")


def main() -> None:
    shot_dir = None
    if "--shots" in sys.argv:
        shot_dir = pathlib.Path(sys.argv[sys.argv.index("--shots") + 1])
    check_content()
    check_layout(shot_dir)


if __name__ == "__main__":
    main()
