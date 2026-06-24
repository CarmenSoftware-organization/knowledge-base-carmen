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
- `bun run lint` — lint with Biome
- `bun run test` — run tests with Vitest + `bun test`

**Run tests with `bun run test`** (it passes `--isolate`). Running bare `bun test` will fail: `mock.module` is process-global, so without per-file isolation mocks leak across files. The `--isolate` flag lives in the npm script because Bun 1.3.14 does not honor `isolate = true` in `bunfig.toml`.

## Env
- `VITE_API_BASE` — Go backend base URL (required at build time in production)
- `VITE_USE_REMOTE_API` — `true` to use a remote API base in dev

## Notes
- Export PDF/DOCX calls `${VITE_API_BASE}/api/export/{pdf,docx}` — **requires the Go backend
  export endpoints** (separate task); inert until those exist.
- SPA routing needs a host-level rewrite of all paths to `index.html` (see `vercel.json` / `nginx.conf`).
