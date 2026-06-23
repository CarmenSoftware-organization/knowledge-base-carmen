#!/usr/bin/env bash
# Start Carmen development services:
#   - Go backend (8080)            — native RAG chat at /api/chat/* + PDF export at /api/export/pdf
#   - Gotenberg sidecar (3001)     — HTML→PDF renderer for /api/export/pdf (needs Docker)
#   - Next.js   frontend/ (3000)   — legacy App Router UI
#   - React SPA frontend-react/ (5173) — Vite SPA (the migration target)
# Runs everything in the background of one terminal; Ctrl-C stops them all.
# Gotenberg listens on 3000 inside the container; we map it to host 3001 to
# avoid clashing with Next.js (3000).
set -uo pipefail

cyan='\033[0;36m'; yellow='\033[1;33m'; green='\033[0;32m'; red='\033[0;31m'; nc='\033[0m'
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

GOTENBERG_CONTAINER="carmen-gotenberg-dev"
GOTENBERG_HOST_PORT=3001
GOTENBERG_URL=""   # stays empty when Docker is unavailable → backend returns 503 for export

printf "${cyan}Starting Carmen Development Services...${nc}\n"

pids=()
cleanup() {
  printf "\nStopping services...\n"
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  # Stop the Gotenberg container (started with --rm, but force-remove to be sure).
  docker rm -f "$GOTENBERG_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup INT TERM EXIT

# 1. Gotenberg sidecar (Docker) — optional. Without it, /api/export/pdf → 503.
printf "${yellow}--- Gotenberg (Port ${GOTENBERG_HOST_PORT}) ---${nc}\n"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker rm -f "$GOTENBERG_CONTAINER" >/dev/null 2>&1 || true
  # Plain gotenberg locally; production additionally hardens it with
  # --chromium-deny-list (see render.yaml). Images are inlined server-side before
  # rendering, so no external loads happen either way.
  ( docker run --rm --name "$GOTENBERG_CONTAINER" -p "${GOTENBERG_HOST_PORT}:3000" gotenberg/gotenberg:8 ) &
  pids+=($!)
  GOTENBERG_URL="http://localhost:${GOTENBERG_HOST_PORT}"
else
  printf "${red}Docker not available — skipping Gotenberg; /api/export/pdf will return 503.${nc}\n"
fi

# 2. Go Backend (serves the native RAG chatbot at /api/chat/* and PDF export).
#    GOTENBERG_URL is passed inline; backend/.env (loaded via godotenv.Overload)
#    must NOT define GOTENBERG_URL or it would override this value.
printf "${yellow}--- Go Backend (Port 8080) ---${nc}\n"
( cd "$ROOT/backend" && GOTENBERG_URL="$GOTENBERG_URL" go run cmd/server/main.go ) &
pids+=($!)

# 3. Frontend (Next.js)
printf "${yellow}--- Next.js Frontend (Port 3000) ---${nc}\n"
( cd "$ROOT/frontend" && npm run dev ) &
pids+=($!)

# 4. Frontend (React SPA — Vite). Points VITE_API_BASE at the local backend.
printf "${yellow}--- React SPA Frontend (Vite, Port 5173) ---${nc}\n"
( cd "$ROOT/frontend-react" && VITE_API_BASE="http://localhost:8080" npm run dev ) &
pids+=($!)

printf "\n${green}All services are starting (Ctrl-C to stop them all).${nc}\n"
printf "   - Go Backend:        http://localhost:8080\n"
if [ -n "$GOTENBERG_URL" ]; then
  printf "   - Gotenberg:         %s\n" "$GOTENBERG_URL"
else
  printf "   - Gotenberg:         (skipped — Docker unavailable; export → 503)\n"
fi
printf "   - Next.js Frontend:  http://localhost:3000\n"
printf "   - React SPA (Vite):  http://localhost:5173\n"

# Wait for all background jobs; Ctrl-C triggers cleanup.
wait
