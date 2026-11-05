#!/usr/bin/env python3
"""Content and, when Chrome is installed, viewport checks for the static dashboard."""

from __future__ import annotations

import base64
import json
import os
import pathlib
import re
import shutil
import socket
import struct
import subprocess
import sys
import threading
import time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "index.html"
CSS_PATH = ROOT / "styles.css"

REQUIRED = [
    "Day 1 · Strength",
    "Strength A",
    "Five lifts, top to bottom. Finish all sets of one before the next.",
    "Warm-up",
    "Easy row or bike",
    "then hip openers",
    "100 min",
    "including warm-up",
    "Set the squat box where the hip is happy",
    "Squat to box",
    "Barbell · box at a hip-happy height",
    "Bench press",
    "Barbell · flat bench",
    "Pull-ups",
    "Bodyweight",
    "Hip thrusts",
    "Barbell · bench",
    "Back extensions",
    "Weighted · Roman chair",
    "SETS × REPS",
]
ORDER = [
    "Squat to box",
    "Bench press",
    "Pull-ups",
    "Hip thrusts",
    "Back extensions",
]
PALETTE = ["#263241", "#334155", "#40516A", "#F1F5F9", "#CBD5E1", "#64748B"]
ACCENTS = ["#67E8F9", "#5EEAD4", "#C4B5FD", "#FCD34D", "#93C5FD"]


def fail(errors: list[str]) -> None:
    print("\n".join(errors))
    raise SystemExit(1)


def visible_text(html: str) -> str:
    text = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.I | re.S)
    text = re.sub(r"<style\b[^>]*>.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text)


def check_content() -> None:
    errors: list[str] = []
    html = HTML_PATH.read_text(encoding="utf-8")
    css = CSS_PATH.read_text(encoding="utf-8")
    blob = html + "\n" + css
    text = visible_text(html)

    if not (ROOT / ".nojekyll").is_file():
        errors.append("missing .nojekyll")
    if 'href="styles.css"' not in html:
        errors.append('stylesheet href must be the relative path styles.css')
    if re.search(r"""(?:href|src)\s*=\s*["']/(?!/)""", html):
        errors.append("root-absolute asset path would miss the /gym/ project site")
    if "<base" in html.lower():
        errors.append("a base tag can retarget the project site")
    if "/gym/gym" in blob:
        errors.append("path /gym/gym/ is not the project root")
    if re.search(r"https?://|url\(\s*['\"]?https?:", blob, flags=re.I):
        errors.append("page must not request remote assets")
    if re.search(r"<script\b|@keyframes|animation\s*:|transition\s*:", blob, flags=re.I):
        errors.append("page must stay static: no script, animation, or transition")
    for token in ("<button", "<input", "<form", "controls"):
        if token in html.lower():
            errors.append(f"unexpected control markup: {token}")

    for phrase in REQUIRED:
        if phrase not in html:
            errors.append(f"missing copy: {phrase}")
    positions = [text.find(name) for name in ORDER]
    if any(pos < 0 for pos in positions) or positions != sorted(positions):
        errors.append(f"exercise order is wrong: {positions}")
    if html.count('class="gd-row"') != 5 or html.count("<svg") != 5:
        errors.append("expected five exercise rows and five diagrams")
    if text.count("3×8") != 4 or text.count("3×10") != 1:
        errors.append("expected four 3×8 prescriptions and one 3×10")
    if html.count("SETS × REPS") != 5:
        errors.append("expected five sets × reps labels")

    lower_blob = blob.lower()
    for color in PALETTE + ACCENTS:
        if color.lower() not in lower_blob:
            errors.append(f"missing color {color}")

    for banned in (r"\brest\b", r"\brpe\b", r"\bkg\b", r"\blbs?\b", r"\b1rm\b", r"\btempo\b"):
        if re.search(banned, text, flags=re.I):
            errors.append(f"invented load or rest copy matched {banned}")

    if errors:
        fail(errors)
    print("content: ok")


class WebSocket:
    def __init__(self, url: str) -> None:
        if not url.startswith("ws://"):
            raise ValueError(url)
        hostport, path = url[len("ws://") :].split("/", 1)
        host, port = hostport.split(":")
        self.sock = socket.create_connection((host, int(port)))
        key = base64.b64encode(os.urandom(16)).decode()
        request = (
            f"GET /{path} HTTP/1.1\r\n"
            f"Host: {hostport}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(request.encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError("websocket handshake failed")
            buf += chunk
        self.buf = b""
        self.next_id = 0

    def send(self, payload: dict) -> None:
        data = json.dumps(payload).encode()
        mask = os.urandom(4)
        header = bytearray([0x81])
        length = len(data)
        if length < 126:
            header.append(0x80 | length)
        elif length < 65536:
            header.append(0x80 | 126)
            header.extend(struct.pack(">H", length))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack(">Q", length))
        masked = bytes(byte ^ mask[index % 4] for index, byte in enumerate(data))
        self.sock.sendall(bytes(header) + mask + masked)

    def _read_exact(self, size: int) -> bytes:
        while len(self.buf) < size:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise ConnectionError("websocket closed")
            self.buf += chunk
        out, self.buf = self.buf[:size], self.buf[size:]
        return out

    def recv(self) -> dict:
        while True:
            first = self._read_exact(1)[0]
            second = self._read_exact(1)[0]
            opcode = first & 0x0F
            length = second & 0x7F
            if length == 126:
                length = struct.unpack(">H", self._read_exact(2))[0]
            elif length == 127:
                length = struct.unpack(">Q", self._read_exact(8))[0]
            if second & 0x80:
                mask = self._read_exact(4)
                data = bytes(byte ^ mask[index % 4] for index, byte in enumerate(self._read_exact(length)))
            else:
                data = self._read_exact(length)
            if opcode == 0x8:
                raise ConnectionError("websocket closed by peer")
            if opcode == 0x9:
                continue
            if opcode == 0x1:
                return json.loads(data.decode())

    def call(self, method: str, params: dict | None = None) -> dict:
        self.next_id += 1
        call_id = self.next_id
        self.send({"id": call_id, "method": method, "params": params or {}})
        while True:
            message = self.recv()
            if message.get("id") != call_id:
                continue
            if "error" in message:
                raise RuntimeError(json.dumps(message["error"]))
            return message.get("result") or {}


LAYOUT_JS = r"""
(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const outside = [];
  const overflow = [];
  const interesting = document.querySelectorAll(
    ".gd-title,.gd-lede,.gd-warm,.gd-note,.gd-row,.gd-num,.gd-name,.gd-kit,.gd-score,.gd-rx-label,.gd-clock-num,.gd-sq"
  );
  for (const el of interesting) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.left < -1 || rect.right > vw + 1 || rect.top < -1 || rect.bottom > vh + 1) {
      outside.push({
        cls: el.className,
        text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 60),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        right: Math.round(rect.right)
      });
    }
    if (el.scrollWidth > el.clientWidth + 2) {
      overflow.push({
        cls: el.className,
        text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 60),
        sw: el.scrollWidth,
        cw: el.clientWidth
      });
    }
  }
  const left = document.querySelector(".gd-left").getBoundingClientRect();
  const sq = document.querySelector(".gd-sq").getBoundingClientRect();
  const rows = [...document.querySelectorAll(".gd-row")].map((el) => {
    const rect = el.getBoundingClientRect();
    const fig = el.querySelector(".gd-fig").getBoundingClientRect();
    const meta = el.querySelector(".gd-meta").getBoundingClientRect();
    const separated = fig.right <= meta.left + 1 || meta.right <= fig.left + 1 || fig.bottom <= meta.top + 1 || meta.bottom <= fig.top + 1;
    return {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      h: Math.round(rect.height),
      figTop: Math.round(fig.top),
      figRight: Math.round(fig.right),
      metaTop: Math.round(meta.top),
      metaLeft: Math.round(meta.left),
      metaBottom: Math.round(meta.bottom),
      diagramOverlapsText: !separated
    };
  });
  const color = (selector, prop) => getComputedStyle(document.querySelector(selector))[prop];
  return {
    innerWidth: vw,
    innerHeight: vh,
    docScrollWidth: document.documentElement.scrollWidth,
    docScrollHeight: document.documentElement.scrollHeight,
    sideBySide: sq.left >= left.right - 2,
    square: { w: Math.round(sq.width), h: Math.round(sq.height) },
    rows,
    outside,
    overflow,
    colors: {
      body: color("body", "backgroundColor"),
      panel: color(".gd-sq", "backgroundColor"),
      raised: color(".gd-note", "backgroundColor"),
      ink: color("body", "color"),
      secondary: color(".gd-lede", "color"),
      badges: [...document.querySelectorAll(".gd-num")].map((el) => getComputedStyle(el).backgroundColor)
    }
  };
})()
"""


def rgb(hex_color: str) -> str:
    value = hex_color.lstrip("#")
    channels = [int(value[index : index + 2], 16) for index in (0, 2, 4)]
    return f"rgb({channels[0]}, {channels[1]}, {channels[2]})"


def png_size(data: bytes) -> tuple[int, int]:
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError("screenshot is not a png")
    return struct.unpack(">II", data[16:24])


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def start_server() -> tuple[ThreadingHTTPServer, int]:
    handler = lambda *args, **kwargs: QuietHandler(  # noqa: E731
        *args, directory=str(ROOT), **kwargs
    )
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, server.server_address[1]


def start_chrome(port: int, profile: pathlib.Path) -> subprocess.Popen:
    chrome = shutil.which("google-chrome") or shutil.which("google-chrome-stable")
    if not chrome:
        raise RuntimeError("chrome missing")
    return subprocess.Popen(
        [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            f"--remote-debugging-port={port}",
            f"--user-data-dir={profile}",
            "--no-first-run",
            "--disable-extensions",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )


def debugger_url(port: int) -> str:
    deadline = time.time() + 15
    last_error = "debugger did not start"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version", timeout=1) as response:
                return json.load(response)["webSocketDebuggerUrl"]
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            time.sleep(0.1)
    raise RuntimeError(last_error)


def open_page(browser: WebSocket, url: str) -> WebSocket:
    target = browser.call("Target.createTarget", {"url": "about:blank"})
    targets = json.load(urllib.request.urlopen(browser_list_url(browser)))
    page = next(item for item in targets if item.get("id") == target["targetId"])
    page_socket = WebSocket(page["webSocketDebuggerUrl"])
    page_socket.call("Page.enable")
    page_socket.call("Runtime.enable")
    page_socket.call("Page.navigate", {"url": url})
    wait_ready(page_socket)
    return page_socket


def browser_list_url(browser: WebSocket) -> str:
    host, port = browser.sock.getpeername()[:2]
    return f"http://{host}:{port}/json/list"


def wait_ready(page: WebSocket) -> None:
    deadline = time.time() + 10
    while time.time() < deadline:
        state = page.call(
            "Runtime.evaluate",
            {"expression": "document.readyState", "returnByValue": True},
        )
        if state.get("result", {}).get("value") == "complete":
            break
        time.sleep(0.05)
    else:
        raise RuntimeError("page did not load")
    page.call(
        "Runtime.evaluate",
        {
            "expression": "document.fonts.ready.then(() => true)",
            "awaitPromise": True,
            "returnByValue": True,
        },
    )
    page.call(
        "Runtime.evaluate",
        {
            "expression": "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))",
            "awaitPromise": True,
            "returnByValue": True,
        },
    )


def evaluate(page: WebSocket) -> dict:
    result = page.call(
        "Runtime.evaluate",
        {"expression": LAYOUT_JS, "returnByValue": True},
    )
    value = result.get("result", {}).get("value")
    if not isinstance(value, dict):
        raise RuntimeError(f"layout script failed: {result}")
    return value


def screenshot(page: WebSocket, beyond: bool = False) -> bytes:
    payload = page.call(
        "Page.captureScreenshot",
        {"format": "png", "captureBeyondViewport": beyond, "fromSurface": True},
    )
    return base64.b64decode(payload["data"])


def check_layout(shot_dir: pathlib.Path | None) -> None:
    chrome = shutil.which("google-chrome") or shutil.which("google-chrome-stable")
    if not chrome:
        print("layout: skipped, Chrome is not installed")
        return

    server, http_port = start_server()
    debug_port_sock = socket.socket()
    debug_port_sock.bind(("127.0.0.1", 0))
    debug_port = debug_port_sock.getsockname()[1]
    debug_port_sock.close()
    profile = pathlib.Path(f"/tmp/gym-chrome-{debug_port}")
    shutil.rmtree(profile, ignore_errors=True)
    process = start_chrome(debug_port, profile)
    errors: list[str] = []
    try:
        browser = WebSocket(debugger_url(debug_port))
        page = open_page(browser, f"http://127.0.0.1:{http_port}/index.html")
        cases = [
            {"name": "1920x1080", "width": 1920, "height": 1080, "side_by_side": True, "vertical_fit": True, "shot": True},
            {"name": "1512x982", "width": 1512, "height": 982, "side_by_side": True, "vertical_fit": True, "shot": True},
            {"name": "1366x768", "width": 1366, "height": 768, "side_by_side": True, "vertical_fit": True, "shot": True},
            {"name": "1440x810", "width": 1440, "height": 810, "side_by_side": True, "vertical_fit": True, "shot": False},
            {"name": "390x844", "width": 390, "height": 844, "side_by_side": False, "vertical_fit": False, "shot": True},
            {"name": "360x740", "width": 360, "height": 740, "side_by_side": False, "vertical_fit": False, "shot": False},
        ]
        for case in cases:
            page.call(
                "Emulation.setDeviceMetricsOverride",
                {
                    "width": case["width"],
                    "height": case["height"],
                    "deviceScaleFactor": 1,
                    "mobile": case["width"] < 500,
                },
            )
            page.call("Page.reload", {"ignoreCache": True})
            wait_ready(page)
            report = evaluate(page)
            label = case["name"]
            print(
                f"layout {label}: side={report['sideBySide']} "
                f"square={report['square']['w']}x{report['square']['h']} "
                f"scroll={report['docScrollWidth']}x{report['docScrollHeight']}"
            )
            if report["innerWidth"] != case["width"] or report["innerHeight"] != case["height"]:
                errors.append(f"{label}: viewport {report['innerWidth']}x{report['innerHeight']}")
            if report["sideBySide"] != case["side_by_side"]:
                errors.append(f"{label}: side-by-side is {report['sideBySide']}")
            if report["docScrollWidth"] > case["width"] + 1:
                errors.append(f"{label}: horizontal document overflow {report['docScrollWidth']}")
            overlaps = [row for row in report["rows"] if row["diagramOverlapsText"]]
            if overlaps:
                errors.append(f"{label}: diagram overlaps exercise text {json.dumps(overlaps)}")
            if case["side_by_side"]:
                stacked_diagram = [
                    row for row in report["rows"] if row["figTop"] >= row["metaBottom"] - 1
                ]
                if stacked_diagram:
                    errors.append(f"{label}: diagram dropped below the exercise text")
                if abs(report["square"]["w"] - report["square"]["h"]) > 2:
                    errors.append(f"{label}: exercise panel is not square {report['square']}")
                if report["square"]["h"] < case["height"] * 0.9:
                    errors.append(f"{label}: exercise panel is smaller than the display {report['square']}")
            else:
                beside = [row for row in report["rows"] if row["figRight"] <= row["metaLeft"] + 1]
                if beside:
                    errors.append(f"{label}: narrow layout put the diagram beside cramped text")
            if case["vertical_fit"]:
                if report["outside"]:
                    errors.append(f"{label}: outside viewport {json.dumps(report['outside'])}")
                if report["docScrollHeight"] > case["height"] + 1:
                    errors.append(f"{label}: vertical document overflow {report['docScrollHeight']}")
                if len(report["rows"]) != 5 or any(row["h"] < 80 for row in report["rows"]):
                    errors.append(f"{label}: rows are not fully sized {report['rows']}")
            else:
                wide = [row for row in report["rows"] if row["left"] < -1 or row["right"] > case["width"] + 1]
                if wide or report["outside"]:
                    horizontal = [
                        item
                        for item in report["outside"]
                        if item["left"] < -1 or item["right"] > case["width"] + 1
                    ]
                    if wide or horizontal:
                        errors.append(f"{label}: horizontal clip {json.dumps({'rows': wide, 'outside': horizontal})}")
                if len(report["rows"]) != 5 or any(row["h"] < 90 for row in report["rows"]):
                    errors.append(f"{label}: mobile rows are too short {report['rows']}")
            if report["overflow"]:
                errors.append(f"{label}: text overflow {json.dumps(report['overflow'])}")
            if case["name"] == "1920x1080":
                expected = {
                    "body": rgb("#263241"),
                    "panel": rgb("#334155"),
                    "raised": rgb("#40516A"),
                    "ink": rgb("#F1F5F9"),
                    "secondary": rgb("#CBD5E1"),
                }
                for key, value in expected.items():
                    if report["colors"][key] != value:
                        errors.append(f"color {key} is {report['colors'][key]}, expected {value}")
                badges = [rgb(color) for color in ACCENTS]
                if report["colors"]["badges"] != badges:
                    errors.append(f"badge colors {report['colors']['badges']}")
            if shot_dir and case["shot"]:
                shot_dir.mkdir(parents=True, exist_ok=True)
                data = screenshot(page)
                width, height = png_size(data)
                if (width, height) != (case["width"], case["height"]):
                    errors.append(f"{label}: screenshot is {width}x{height}")
                (shot_dir / f"strength-a-{label}.png").write_bytes(data)
                if case["width"] == 390:
                    full = screenshot(page, beyond=True)
                    (shot_dir / "strength-a-390-full.png").write_bytes(full)
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        server.shutdown()
        shutil.rmtree(profile, ignore_errors=True)
    if errors:
        fail(errors)
    print("layout: ok")


def main() -> None:
    shot_dir = None
    if "--shots" in sys.argv:
        shot_dir = pathlib.Path(sys.argv[sys.argv.index("--shots") + 1])
    check_content()
    check_layout(shot_dir)


if __name__ == "__main__":
    main()
