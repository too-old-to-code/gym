#!/usr/bin/env python3
"""Check Firebase app initialization only: public config, no database, boards still render."""

from __future__ import annotations

import importlib.util
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("check_dashboard", ROOT / "tests" / "check_dashboard.py")
dash = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(dash)

SDK = "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js"
CONFIG = {
    "apiKey": "AIzaSyDEozF0XzSNcJRsKQSqGJkFWd6F6Z05M68",
    "authDomain": "gym-dashboard-a8ae3.firebaseapp.com",
    "projectId": "gym-dashboard-a8ae3",
    "storageBucket": "gym-dashboard-a8ae3.firebasestorage.app",
    "messagingSenderId": "58358558669",
    "appId": "1:58358558669:web:56318ae4bd96f9d4a75e84",
}
STATUS_JS = r"""
new Promise((resolve) => {
  const started = Date.now();
  const tick = () => {
    const state = document.documentElement.dataset.firebaseApp;
    if (state === "initialized" || state === "unavailable" || Date.now() - started > 12000) {
      const info = window.gymFirebase || {};
      resolve({
        state: state || "missing",
        realtime: document.documentElement.dataset.firebaseRealtime || "",
        initialized: !!info.initialized,
        realtimeConnected: !!info.realtimeConnected,
        databaseConfigured: !!info.databaseConfigured,
        projectId: info.projectId || "",
        title: (document.querySelector("h1") || {}).textContent || ""
      });
      return;
    }
    setTimeout(tick, 50);
  };
  tick();
})
"""


def fail(errors: list[str]) -> None:
    print("\n".join(errors))
    raise SystemExit(1)


def check_source() -> None:
    errors: list[str] = []
    source = (ROOT / "firebase-init.js").read_text(encoding="utf-8")
    if SDK not in source:
        errors.append("firebase-init.js must import the pinned firebase-app browser module")
    if source.count("initializeApp") < 2:
        errors.append("firebase-init.js must call initializeApp")
    for key, value in CONFIG.items():
        if f'{key}: "{value}"' not in source:
            errors.append(f"firebase config missing {key}")
    if re.search(r"databaseURL\s*:", source):
        errors.append("databaseURL must not be guessed")
    for banned in ("getDatabase", "getAuth", "getAnalytics", "getFirestore", "getStorage", "firebase-database", "firebase-auth"):
        if banned in source:
            errors.append(f"firebase-init.js imports or calls {banned}")
    if "not-configured" not in source or "realtimeConnected" not in source:
        errors.append("init status must distinguish app startup from realtime")
    if errors:
        fail(errors)
    print("firebase source: ok")


def open_browser():
    server, http_port = dash.start_server()
    debug_sock = dash.socket.socket()
    debug_sock.bind(("127.0.0.1", 0))
    debug_port = debug_sock.getsockname()[1]
    debug_sock.close()
    profile = pathlib.Path(f"/tmp/gym-firebase-{debug_port}")
    dash.shutil.rmtree(profile, ignore_errors=True)
    process = dash.start_chrome(debug_port, profile)
    browser = dash.WebSocket(dash.debugger_url(debug_port))
    return server, http_port, process, profile, browser


def page_socket(browser: dash.WebSocket):
    target = browser.call("Target.createTarget", {"url": "about:blank"})
    targets = dash.json.load(dash.urllib.request.urlopen(dash.browser_list_url(browser)))
    page_info = next(item for item in targets if item.get("id") == target["targetId"])
    page = dash.WebSocket(page_info["webSocketDebuggerUrl"])
    page.call("Page.enable")
    page.call("Runtime.enable")
    page.call("Network.enable")
    return page


def read_status(page: dash.WebSocket) -> dict:
    result = page.call(
        "Runtime.evaluate",
        {"expression": STATUS_JS, "awaitPromise": True, "returnByValue": True},
    )
    value = result.get("result", {}).get("value")
    if not isinstance(value, dict):
        raise RuntimeError(f"status script failed: {result}")
    return value


def check_browser() -> None:
    chrome = dash.shutil.which("google-chrome") or dash.shutil.which("google-chrome-stable")
    if not chrome:
        print("firebase browser: skipped, Chrome is not installed")
        return
    errors: list[str] = []
    server, http_port, process, profile, browser = open_browser()
    try:
        page = page_socket(browser)
        page.call("Page.navigate", {"url": f"http://127.0.0.1:{http_port}/index.html"})
        dash.wait_ready(page)
        live = read_status(page)
        print(f"firebase live: {live}")
        if live.get("title") != "Strength A":
            errors.append(f"board title changed during init: {live.get('title')}")
        if live.get("state") != "initialized" or not live.get("initialized"):
            errors.append(f"initializeApp did not complete: {live}")
        if live.get("projectId") != CONFIG["projectId"]:
            errors.append(f"initialized project is {live.get('projectId')}")
        if live.get("realtime") != "not-configured" or live.get("realtimeConnected") or live.get("databaseConfigured"):
            errors.append(f"init claimed a database connection: {live}")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except dash.subprocess.TimeoutExpired:
            process.kill()
        server.shutdown()
        dash.shutil.rmtree(profile, ignore_errors=True)

    server, http_port, process, profile, browser = open_browser()
    try:
        page = page_socket(browser)
        blocked = page.call("Network.setBlockedURLs", {"urls": ["*://www.gstatic.com/*"]})
        page.call("Network.setCacheDisabled", {"cacheDisabled": True})
        page.call("Page.navigate", {"url": f"http://127.0.0.1:{http_port}/index.html"})
        dash.wait_ready(page)
        failed = read_status(page)
        print(f"firebase blocked: {failed} block={blocked}")
        if failed.get("title") != "Strength A":
            errors.append(f"board did not render when the SDK was blocked: {failed.get('title')}")
        if failed.get("state") != "unavailable" or failed.get("initialized"):
            errors.append(f"SDK failure was not contained: {failed}")
        if failed.get("realtimeConnected") or failed.get("databaseConfigured") or failed.get("realtime") != "not-configured":
            errors.append(f"SDK failure changed realtime status: {failed}")
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
    print("firebase browser: ok")


def main() -> None:
    check_source()
    check_browser()


if __name__ == "__main__":
    main()
