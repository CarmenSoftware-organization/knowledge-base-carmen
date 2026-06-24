# Adopt Bun in the frontend projects — Design

**Date:** 2026-06-24
**Status:** Approved (pending spec review)
**Scope:** `frontend/` (Next.js 16 App Router) and `frontend-react/` (Vite 7 + React 19 SPA)

## Goal

Use [Bun](https://bun.sh) (v1.3.14, already installed) as the **package manager + script
runner + test runner** for both frontend projects, in **all environments** — local dev,
Vercel, and Docker.

**Vite and Next.js remain the bundlers.** Bun does not replace them; it runs them. This is a
runtime/tooling swap, not a build-system rewrite.

## Constraints (decided during brainstorming)

- **Both** frontends adopt Bun (`frontend/` is legacy / a migration source, but the user wants
  parity; it gets the same treatment, lighter).
- Bun role: **PM + runtime + `bun test`** (deepest practical option short of replacing Vite).
- Reach: **everywhere** — local `run_dev.sh`, Vercel, Docker.
- Strategy: **incremental by capability** (3 PRs), so the risky test-runner migration ships
  behind an already-green Bun pipeline.

## Resolved defaults (flag during spec review to change)

- **Next.js standalone production server stays on Node** (`node server.js` in the Docker runner
  stage). Bun builds it, Node runs it. Next's standalone output is designed for Node; running it
  under the Bun runtime is the single riskiest runtime change and buys little. Bun is still the
  runtime for dev/build/test.
- **No new GitHub Actions CI.** The existing workflows (`auto-provision-sync-reindex.yml`,
  `sync-wiki-content-to-main.yml`) do not build or test the frontends, and this work does not add
  a frontend CI job. Frontend verification stays on Vercel preview deploys + local `bun test`.

## Current state (verified)

| | `frontend/` | `frontend-react/` |
|---|---|---|
| Stack | Next.js 16 App Router | Vite 7 + React 19 + React Router 7 (SPA) |
| Package manager | npm (`package-lock.json` + stub `pnpm-lock.yaml`) | npm (`package-lock.json`) |
| Test runner | Jest (`next/jest` + `babel-jest`) | Vitest (jsdom, `globals: true`) |
| Test files | 5 (`__tests__/*.test.ts`, lib/DOM only, **no RTL**) | 16 (`src/**/*.test.{ts,tsx}`, RTL + lib) |
| Dev | `npm run dev` → :3000 | `npm run dev` → :5173 |
| Deploy | Vercel (`framework: nextjs`) + Dockerfile (Node standalone) | Vercel (static `dist/`) + Dockerfile (nginx) |

- Bun: **not yet used anywhere** (no `bun.lock` / `bunfig.toml`).
- `frontend/tsconfig.json` has `@/*` paths; `frontend-react` aliases `@` via `vite.config.ts`.
  Bun reads `tsconfig.json` `paths` automatically.
- `run_dev.sh` lines 55 & 60 launch the two frontends with `npm run dev`.

## Lockfile policy

Bun 1.2+ writes a **text** `bun.lock` (not the old binary `bun.lockb`). Commit `bun.lock` in each
frontend. **Delete** `package-lock.json` from both and the `pnpm-lock.yaml` stub from `frontend/`
so there is one lockfile per project and no drift. `node_modules` stays gitignored.

---

## PR1 — Bun as package manager + script runner + deploy

**Goal:** a green pipeline on Bun *without touching the test runner* (Vitest/Jest still execute,
launched via `bun run test`).

### Changes
- Run `bun install` in each frontend → generates `bun.lock`. Remove `package-lock.json` (both) and
  `pnpm-lock.yaml` (`frontend/`).
- **Vercel** — `frontend/vercel.json` and `frontend-react/vercel.json`:
  - `installCommand`: `npm ci` → `bun install --frozen-lockfile`
  - `buildCommand`: `npm run build` → `bun run build`
  - everything else unchanged (`framework: nextjs`, `outputDirectory: dist`, rewrites, regions).
- **Docker `frontend-react/Dockerfile`** (build stage):
  - `FROM node:22-alpine` → `FROM oven/bun:1-alpine`
  - `COPY package*.json ./` → `COPY package.json bun.lock ./`
  - `RUN npm ci` → `RUN bun install --frozen-lockfile`
  - `RUN npm run build` → `RUN bun run build`
  - serve stage (nginx) unchanged.
- **Docker `frontend/Dockerfile`**:
  - `deps` + `builder` stages: install + build with Bun (`oven/bun:1-alpine`, `bun install
    --frozen-lockfile`, `bun run build`).
  - **`runner` stage stays Node** (`node:20-alpine`, `CMD ["node", "server.js"]`) — deliberate
    exception per Resolved defaults. Adjust the `COPY --from=...` stage names accordingly.
- **`run_dev.sh`** lines 55 & 60: `npm run dev` → `bun run dev` (update the inline comment too).
- `package.json` scripts stay as-is — `bun run <script>` executes them unchanged.

### Verify
- `bun install` clean in both; only `bun.lock` present as lockfile.
- `bun run build` succeeds in both.
- `bun run test` (still Vitest / Jest) passes in both (parity with current pass counts).
- `bun run dev` serves both (:3000 / :5173); `run_dev.sh` brings up the full stack.
- `docker build` of `frontend-react` succeeds; image serves via nginx.
- Vercel preview deploy is green for both projects.

---

## PR2 — `frontend-react`: Vitest → `bun test` (highest risk, 16 files)

### Changes
- Add `frontend-react/bunfig.toml`:
  ```toml
  [test]
  preload = ["./src/test/setup.ts"]
  ```
- Rewrite `src/test/setup.ts`:
  - **DOM:** register `@happy-dom/global-registrator` (new devDep) in place of jsdom. Keep the
    existing `IntersectionObserver` and `matchMedia` mocks (happy-dom may not cover them; keep to
    be safe).
  - **jest-dom matchers:** replace `import "@testing-library/jest-dom/vitest"` with
    ```ts
    import { expect } from "bun:test";
    import * as matchers from "@testing-library/jest-dom/matchers";
    expect.extend(matchers);
    ```
  - **`import.meta.env` shim:** define `PROD = false`, `DEV = true`, `MODE = "test"` (plus any
    `VITE_*` a test needs). This fixes the verified dependency in `src/lib/config.ts`
    (`import.meta.env.PROD`, `VITE_API_BASE`, `VITE_USE_REMOTE_API`).
- Per test file (16 total; 8 use `vi.*`):
  - imports `from "vitest"` → `from "bun:test"`.
  - `vi.mock(path, factory)` → `mock.module(path, factory)`; `vi.fn()` → `mock()` / `jest.fn()`.
  - Because `mock.module` is **not hoisted** like `vi.mock`, files that mock a module and then
    render it may need to move the module-under-test to a **dynamic `await import()`** after the
    `mock.module` call so the mock is in place first.
- `package.json`:
  - `"test": "bun test"`, `"test:watch": "bun test --watch"`.
  - remove devDep `vitest`; add `@happy-dom/global-registrator`. `jsdom` can be dropped if no test
    still needs it.
- `vite.config.ts`: remove the `test:` block and the `/// <reference types="vitest/config" />`
  line (cosmetic; bundler config no longer carries test config).

### Verify
- `bun test` runs all 16 files; pass count matches the prior Vitest run (parity).

---

## PR3 — `frontend`: Jest → `bun test` (lowest risk, 5 files)

The 5 tests are lib/DOM only (`ssrf-guard`, `url-safety`, `wiki-route-security`,
`dompurify-security`, `export-images`) — **no RTL render**, no `vi.*`/`jest.*` mocks.
`dompurify-security` imports DOMPurify directly and needs a DOM.

### Changes
- Add `frontend/bunfig.toml` with `[test] preload` pointing at a small new setup file that
  registers `@happy-dom/global-registrator` (for the DOMPurify test) and jest-dom matchers.
- `@/` alias: Bun reads `tsconfig.json` `paths` automatically — no mapping needed (replaces the
  Jest `moduleNameMapper`).
- Drop the Jest toolchain: `next/jest`, `babel-jest`, `next/babel`, `transformIgnorePatterns`
  (Bun transpiles TS/ESM natively, so the ESM-interop allowlist is unnecessary).
- `package.json`:
  - `"test": "bun test __tests__"` (scope the run to the test dir; keeps `.next/` out).
  - remove `jest`, `jest-environment-jsdom`, `babel-jest`, `@babel/core`, and other Jest-only
    devDeps; add `@happy-dom/global-registrator`.
  - delete `jest.config.mjs` and `jest.setup.ts`.

### Verify
- `bun test` runs all 5 files green (parity with the prior Jest run).

---

## Risks & mitigations

1. **`import.meta.env.PROD/DEV/MODE` are Vite-injected, absent under `bun test`** *(verified in
   `frontend-react/src/lib/config.ts`)* → preload shim sets them.
2. **`vi.mock` hoisting vs `mock.module` ordering** → the 8 mock-using files may need a dynamic
   `import()` of the module-under-test after `mock.module`.
3. **happy-dom ≠ jsdom** for `framer-motion` / `recharts` / `mermaid` rendering → keep the existing
   `IntersectionObserver` + `matchMedia` mocks; if a specific file genuinely needs jsdom, register
   jsdom for that file instead of happy-dom.
4. **Next.js standalone server under the Bun runtime** → avoided; runner stage stays on Node.
5. **Lockfile drift** → one committed `bun.lock` per project; npm/pnpm lockfiles deleted; Vercel
   `installCommand` set explicitly to `bun install --frozen-lockfile`.

## Out of scope

- Replacing Vite or Next with Bun's bundler.
- Running the Next.js production server on the Bun runtime.
- Adding frontend CI (GitHub Actions).
- Any change to the Go backend, content pipeline, or `render.yaml` (backend-only blueprint).

## Success criteria

- Both frontends install with `bun install`, build with `bun run build`, and dev with
  `bun run dev`; `run_dev.sh` brings the stack up using Bun.
- A single `bun.lock` per frontend is committed; no npm/pnpm lockfiles remain.
- Vercel deploys both projects using Bun; `frontend-react` Docker image builds with Bun.
- `bun test` passes all tests in both projects with parity to the previous runners
  (16 + 5 files).
