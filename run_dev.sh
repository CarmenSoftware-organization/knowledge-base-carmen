#!/usr/bin/env bash
# Start Carmen development services:
#   - Go backend (8080)            — native RAG chat at /api/chat/*
#   - Next.js   frontend-next/ (3301)   — legacy App Router UI
#   - React SPA frontend-react/ (3302) — Vite SPA (the migration target)
# Runs everything in the background of one terminal; Ctrl-C stops them all.
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

# 1. Go Backend (serves the native RAG chatbot at /api/chat/*).
printf "${yellow}--- Go Backend (Port 8080) ---${nc}\n"
( cd "$ROOT/backend" && go run cmd/server/main.go ) &
pids+=($!)

# 2. Frontend (Next.js)
printf "${yellow}--- Next.js Frontend (Port 3301) ---${nc}\n"
( cd "$ROOT/frontend-next" && bun run dev ) &
pids+=($!)

# 3. Frontend (React SPA — Vite). Points VITE_API_BASE at the local backend.
printf "${yellow}--- React SPA Frontend (Vite, Port 3302) ---${nc}\n"
( cd "$ROOT/frontend-react" && VITE_API_BASE="http://localhost:8080" bun run dev ) &
pids+=($!)

printf "\n${green}All services are starting (Ctrl-C to stop them all).${nc}\n"
printf "   - Go Backend:        http://localhost:8080\n"
printf "   - Next.js Frontend:  http://localhost:3301\n"
printf "   - React SPA (Vite):  http://localhost:3302\n"

# Wait for all background jobs; Ctrl-C triggers cleanup.
wait
