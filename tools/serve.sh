#!/bin/sh
# Serves dist/ on http://localhost:8123 (the game fetches dist/music/* over HTTP, so open it through a server, not file://)
cd "$(dirname "$0")/../dist" && exec python3 -m http.server 8123
