"""Optional local preview for browsers that restrict opening HTML files."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import webbrowser

parser = argparse.ArgumentParser(description="打开挂机修仙原版试玩")
parser.add_argument("--port", type=int, default=8766)
parser.add_argument("--no-browser", action="store_true")
args = parser.parse_args()
directory = Path(__file__).resolve().parent
if not (directory / "index.html").is_file():
    directory = directory.parent / "dist-original"
if not (directory / "index.html").is_file():
    raise SystemExit("找不到游戏文件。请先执行 npm run build:original。")

handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
    address = f"http://127.0.0.1:{args.port}/index.html"
    print(f"原版试玩已启动：{address}\n退出请按 Ctrl+C。", flush=True)
    if not args.no_browser:
        webbrowser.open(address)
    server.serve_forever()
