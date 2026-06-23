#!/usr/bin/env bash
# Start Carmen development services (Go backend + Next.js frontend).
# sh port of run_dev.ps1. Unlike the PowerShell version (separate windows),
# this runs both services in the background of one terminal and stops both on Ctrl-C.
set -uo pipefail

cyan='\033[0;36m'; yellow='\033[1;33m'; green='\033[0;32m'; nc='\033[0m'
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

printf "${cyan}Starting Carmen Development Services...${nc}\n"

pids=()
cleanup() {
  printf "\nStopping services...\n"
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup INT TERM EXIT

# 1. Go Backend (serves the native RAG chatbot at /api/chat/*)
printf "${yellow}--- Go Backend (Port 8080) ---${nc}\n"
( cd "$ROOT/backend" && go run cmd/server/main.go ) &
pids+=($!)

# 2. Frontend (Next.js)
printf "${yellow}--- Next.js Frontend (Port 3000) ---${nc}\n"
( cd "$ROOT/frontend" && npm run dev ) &
pids+=($!)

printf "\n${green}All services are starting (Ctrl-C to stop both).${nc}\n"
printf "   - Go Backend: http://localhost:8080\n"
printf "   - Frontend:   http://localhost:3000\n"

# Wait for both background jobs; Ctrl-C triggers cleanup.
wait
