# Carmen Frontend (React SPA)

Vite + React Router v7 SPA clone of the Next.js `frontend/`. Talks only to the Go backend.

## Run
```bash
cd frontend-react
bun install
VITE_API_BASE=http://localhost:8080 bun run dev
```

## Commands
- `bun run build` — production build to `dist/`
- `bun run preview` — preview the built app
- `bun run lint` / `bun run test`

## Env
- `VITE_API_BASE` — Go backend base URL (required at build time in production)
- `VITE_USE_REMOTE_API` — `true` to use a remote API base in dev

## Notes
- Export PDF/DOCX calls `${VITE_API_BASE}/api/export/{pdf,docx}` — **requires the Go backend
  export endpoints** (separate task); inert until those exist.
- SPA routing needs a host-level rewrite of all paths to `index.html` (see `vercel.json` / `nginx.conf`).
