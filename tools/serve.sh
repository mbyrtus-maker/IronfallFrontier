#!/bin/sh
# Serves docs/ on http://localhost:8123 (the game fetches docs/music/* over HTTP, so open it through a server, not file://)
cd "$(dirname "$0")/../docs" && exec python3 -m http.server 8123
