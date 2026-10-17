#!/usr/bin/env python3
"""Loopback-only ephemeral HTTP mock; all merge logic lives in the Swift package."""
import http.server
import json
import pathlib
import signal
import socket
import subprocess
import sys
import tempfile
import threading

def stop_server(*_):
    raise KeyboardInterrupt

signal.signal(signal.SIGTERM, stop_server)

binary = pathlib.Path(sys.argv[1]).resolve(strict=True)
mode = sys.argv[2] if len(sys.argv) > 2 else "smoke"
with tempfile.TemporaryDirectory(prefix="organization-http-") as directory:
    state = pathlib.Path(directory) / "mock-state.json"
    lock = threading.Lock()
    dropped = [False]
    limited = mode in ("--limited-serve", "smoke-limit", "smoke-limit-concurrent")
    counts = {"begin": 0, "sync": 0, "finish": 0}
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass
        def do_POST(self):
            if self.path != ("/sync/limited" if limited else "/sync"):
                self.send_error(404); return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 4_000_000:
                    self.send_error(413); return
                payload = self.rfile.read(length)
                parsed = json.loads(payload)
                with lock:
                    if limited and parsed.get("action") in counts: counts[parsed["action"]] += 1
                    result = subprocess.run([str(binary), "limited" if limited else "request", str(state)], input=payload, capture_output=True, timeout=15)
                    if result.returncode:
                        self.send_error(400); return
                    if parsed.get("operations") and not dropped[0]:
                        dropped[0] = True
                        self.connection.shutdown(socket.SHUT_RDWR)
                        self.connection.close(); return
                decoded = json.loads(result.stdout)
                failure = decoded.get("failure")
                admission = decoded.get("admission")
                denied = limited and admission is not None and admission.get("permit") is None
                self.send_response(429 if failure or denied else 200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(result.stdout)))
                self.end_headers(); self.wfile.write(result.stdout)
            except (ValueError, subprocess.TimeoutExpired):
                self.send_error(400)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    try:
        endpoint = "http://127.0.0.1:" + str(server.server_port)
        if mode in ("--serve", "--limited-serve"):
            print("Test server: " + endpoint, flush=True)
            thread.join()
        else:
            subprocess.run([str(binary), mode, endpoint], check=True)
            assert dropped[0], "fault injection was not exercised"
            if mode == "smoke-limit":
                assert counts == {"begin": 9, "sync": 9, "finish": 6}, counts
                print("HTTP request counts verified: local blocked retry and reopen issue no extra requests.")
            print("Committed-response loss verified; temporary server data removed on exit.")
    except KeyboardInterrupt:
        print("Test server stopped; temporary data removed.")
    finally:
        server.shutdown(); server.server_close(); thread.join()
