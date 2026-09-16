import http.server
import socketserver
import socket
import sys

DEFAULT_PORT = 8080

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True

port = DEFAULT_PORT
httpd = None

for p in range(DEFAULT_PORT, DEFAULT_PORT + 20):
    try:
        httpd = socketserver.TCPServer(("", p), Handler)
        port = p
        break
    except OSError:
        continue

if not httpd:
    print("Could not find an open port.")
    sys.exit(1)

local_ip = get_local_ip()

print("=" * 60)
print("  🏢 GANESH HERITAGE MEMBER DIRECTORY SERVER")
print("=" * 60)
print(f"  Local computer:  http://localhost:{port}")
print(f"  Mobile phone:    http://{local_ip}:{port}")
print("=" * 60)
print("  Press Ctrl+C to stop the server.")
print("=" * 60)
sys.stdout.flush()

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
