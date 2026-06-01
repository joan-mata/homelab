#!/usr/bin/env python3
"""
On-demand Docker service wakeup proxy.

nginx routes 502/503 errors here via a named location (@wake).
This service starts the compose stack and returns a loading page
that polls /_wakeup/status until the backend is ready, then redirects.
An idle monitor stops stacks that haven't been woken in idle_minutes.
"""
import json
import subprocess
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

IDLE_CHECK_INTERVAL = 60  # seconds between idle checks

# domain → service config
# group: stacks that share a compose file (e.g. podcasts + n8n)
SERVICES: dict[str, dict] = {
    "cv.joanmata.com": {
        "name": "CV Generator",
        "dir": "/Users/server_user/Documents/Create_CVs",
        "file": "docker-compose.server.yml",
        "health": "cv-frontend",
        "idle_minutes": 120,
        "group": "cv",
    },
    "refnotes.joanmata.com": {
        "name": "Referee Notes",
        "dir": "/Users/server_user/Documents/RefereeNotes",
        "file": "docker-compose.yml",
        "health": "refnotes-frontend",
        "idle_minutes": 120,
        "group": "refnotes",
    },
    "f1.joanmata.com": {
        "name": "F1 Archive",
        "dir": "/Users/server_user/Documents/f1_archive",
        "file": "docker-compose.yml",
        "health": "f1-proxy",
        "idle_minutes": 120,
        "group": "f1",
    },
    "gastia.joanmata.com": {
        "name": "Gastia",
        "dir": "/Users/server_user/Documents/gastia",
        "file": "docker-compose.yml",
        "health": "gastia-nginx-1",
        "idle_minutes": 120,
        "group": "gastia",
    },
    "biblioteca.joanmata.com": {
        "name": "Biblioteca",
        "dir": "/Users/server_user/Documents/biblioteca",
        "file": "docker-compose.yml",
        "health": "biblioteca_web",
        "idle_minutes": 120,
        "group": "biblioteca",
    },
    "podcasts.joanmata.com": {
        "name": "Podcasts",
        "dir": "/Users/server_user/Documents/bot_podcasts",
        "file": "docker-compose.yml",
        "health": "podcasts_web",
        "idle_minutes": 120,
        "group": "bot_podcasts",
    },
    "n8n.joanmata.com": {
        "name": "n8n",
        "dir": "/Users/server_user/Documents/bot_podcasts",
        "file": "docker-compose.yml",
        "health": "bot_podcasts-n8n-1",
        "idle_minutes": 120,
        "group": "bot_podcasts",
    },
}

# Per-group state: group → {"started_at": float, "starting": bool}
_groups: dict[str, dict] = {}
_lock = threading.Lock()


def _is_ready(container: str) -> bool:
    """True if container is running and healthy (or has no healthcheck)."""
    r = subprocess.run(
        [
            "docker", "inspect",
            "--format", "{{.State.Running}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}",
            container,
        ],
        capture_output=True, text=True, timeout=5,
    )
    output = r.stdout.strip()
    if not output or "|" not in output:
        return False
    running_str, health = output.split("|", 1)
    return running_str == "true" and health in ("healthy", "none")


def _start_group(host: str):
    svc = SERVICES[host]
    group = svc["group"]

    with _lock:
        g = _groups.setdefault(group, {})
        if g.get("starting"):
            return
        g["starting"] = True
        g["started_at"] = time.time()

    try:
        print(f"[wake] starting {group} ({host})", flush=True)
        subprocess.run(
            ["docker", "compose", "-f", svc["file"], "up", "-d"],
            cwd=svc["dir"],
            capture_output=True,
            timeout=120,
        )
        print(f"[wake] {group} compose up done", flush=True)
    except Exception as e:
        print(f"[wake] error starting {group}: {e}", flush=True)
    finally:
        with _lock:
            _groups[group]["starting"] = False


def _idle_monitor():
    while True:
        time.sleep(IDLE_CHECK_INTERVAL)
        now = time.time()

        with _lock:
            snapshot = {g: dict(s) for g, s in _groups.items()}

        for group, state in snapshot.items():
            if state.get("starting"):
                continue

            svc = next((s for s in SERVICES.values() if s["group"] == group), None)
            if not svc:
                continue

            idle_secs = svc["idle_minutes"] * 60
            if now - state.get("started_at", 0) < idle_secs:
                continue

            if _is_ready(svc["health"]):
                print(f"[idle] stopping {group} after {svc['idle_minutes']}min idle", flush=True)
                subprocess.run(
                    ["docker", "compose", "-f", svc["file"], "stop"],
                    cwd=svc["dir"],
                    capture_output=True,
                    timeout=60,
                )

            with _lock:
                _groups.pop(group, None)


LOADING_HTML = """\
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Iniciando {name}…</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background:#0f0f0f;color:#e0e0e0;
  display:flex;align-items:center;justify-content:center;
  min-height:100vh;flex-direction:column;gap:24px;
}}
.ring{{
  width:52px;height:52px;
  border:3px solid #1e1e1e;
  border-top-color:#7c6af7;
  border-radius:50%;
  animation:spin .8s linear infinite;
}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
h1{{font-size:1.4rem;font-weight:500;color:#fff}}
p{{font-size:.85rem;color:#555}}
</style>
</head>
<body>
<div class="ring"></div>
<h1>Iniciando {name}</h1>
<p>Espera un momento…</p>
<script>
const target = {url_json};
async function check() {{
  try {{
    const r = await fetch('/_wakeup/status', {{cache:'no-store'}});
    const d = await r.json();
    if (d.ready) location.href = target;
  }} catch(e) {{}}
}}
setInterval(check, 3000);
setTimeout(check, 2000);
</script>
</body>
</html>
"""


class WakeupHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/_wakeup/status"):
            self._handle_status()
        else:
            self._handle_wake()

    def _handle_status(self):
        host = self.headers.get("X-Wake-Host", "")
        svc = SERVICES.get(host)
        if not svc:
            self._send(404, "application/json", b'{"ready":false}')
            return
        ready = _is_ready(svc["health"])
        self._send(200, "application/json", json.dumps({"ready": ready}).encode())

    def _handle_wake(self):
        host = self.headers.get("X-Wake-Host", "")
        uri = self.headers.get("X-Wake-URI", "/")
        scheme = self.headers.get("X-Wake-Scheme") or "https"

        svc = SERVICES.get(host)
        if not svc:
            self._send(404, "text/plain", b"Unknown service")
            return

        threading.Thread(target=_start_group, args=(host,), daemon=True).start()

        original_url = f"{scheme}://{host}{uri}"
        body = LOADING_HTML.format(
            name=svc["name"],
            url_json=json.dumps(original_url),
        ).encode()
        self._send(200, "text/html; charset=utf-8", body)

    def _send(self, code: int, ct: str, body: bytes):
        self.send_response(code)
        self.send_header("Content-Type", ct)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        host = self.headers.get("X-Wake-Host", "?") if hasattr(self, "headers") else "?"
        print(f"[{host}] {args[0]} {args[1]}", flush=True)


if __name__ == "__main__":
    print("Wakeup service listening on :8080", flush=True)
    threading.Thread(target=_idle_monitor, daemon=True).start()
    HTTPServer(("0.0.0.0", 8080), WakeupHandler).serve_forever()
