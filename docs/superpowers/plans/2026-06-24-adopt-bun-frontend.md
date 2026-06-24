# Adopt Bun in the frontend projects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Bun the package manager + script runner + test runner for both `frontend/` (Next.js) and `frontend-react/` (Vite SPA), across local dev, Vercel, and Docker.

**Architecture:** Three incremental PRs. PR1 switches package management, script running, and deploy commands to Bun while the existing Vitest/Jest suites keep running (green pipeline on Bun first). PR2 migrates `frontend-react` tests Vitest → `bun test`. PR3 migrates `frontend` tests Jest → `bun test`. Vite and Next.js stay as the bundlers; Bun only runs them.

**Tech Stack:** Bun 1.3.14 (installed), Next.js 16, Vite 7, React 19, `@happy-dom/global-registrator`, `@testing-library/jest-dom`, `@testing-library/react`.

**Spec:** `docs/superpowers/specs/2026-06-24-adopt-bun-frontend-design.md`

## Global Constraints

- Bun version installed: **1.3.14**. Lockfile is the **text `bun.lock`** (Bun 1.2+), committed; no binary `bun.lockb`.
- **One lockfile per project.** Delete `package-lock.json` (both) and `pnpm-lock.yaml` (`frontend/`).
- **Vite and Next.js remain the bundlers.** Do not introduce `bun build` as a bundler.
- **Next.js standalone production server runs on Node** (`node server.js` in the Docker runner stage). Bun builds it; Node runs it.
- **No new GitHub Actions CI.** Existing workflows do not build the frontends; do not add a frontend CI job.
- Vercel install command everywhere: `bun install --frozen-lockfile`. Vercel build command: `bun run build`.
- Test parity: after each test migration, `bun test` must pass the **same** set as the previous runner — `frontend-react` 16 files, `frontend` 5 files.
- Verified facts to rely on:
  - Under `bun test`, `import.meta.env` aliases `process.env`; `import.meta.env.PROD` / `VITE_API_BASE` are `undefined` (dev behavior) and `import.meta.env` is writable from a preload.
  - `frontend/__tests__/*` use Jest **globals** (no `import` of `describe`/`it`/`expect`) and no `vi.*`/`jest.*` mocks — Bun supplies these globals, so test-file bodies need no edits.
  - Bun reads `tsconfig.json` `paths`; the `@/*` alias resolves with no extra mapping (`frontend` → `./*`, `frontend-react` → `./src/*`).

---

# PR1 — Bun as package manager + runner + deploy

Branch: `feat/bun-frontend-pm-deploy`

## Task 1: Generate `bun.lock`, drop npm/pnpm lockfiles

**Files:**
- Create: `frontend/bun.lock`, `frontend-react/bun.lock`
- Delete: `frontend/package-lock.json`, `frontend/pnpm-lock.yaml`, `frontend-react/package-lock.json`

**Interfaces:**
- Produces: committed `bun.lock` in each project that PR1 Docker/Vercel tasks install from with `--frozen-lockfile`.

- [ ] **Step 1: Install with Bun in `frontend-react`**

```bash
cd frontend-react && bun install
```
Expected: completes; `bun.lock` created; `node_modules/` populated.

- [ ] **Step 2: Build to prove the toolchain works under Bun**

```bash
cd frontend-react && bun run build
```
Expected: `tsc -b && vite build` succeeds; `dist/` produced.

- [ ] **Step 3: Run the existing Vitest suite via Bun (still Vitest)**

```bash
cd frontend-react && bun run test
```
Expected: Vitest runs all 16 files green.

- [ ] **Step 4: Install + build + test `frontend`**

```bash
cd frontend && bun install && bun run build && bun run test
```
Expected: `bun.lock` created; `next build` succeeds; Jest runs 5 files green.

- [ ] **Step 5: Remove the npm/pnpm lockfiles**

```bash
git rm frontend/package-lock.json frontend/pnpm-lock.yaml frontend-react/package-lock.json
```
Expected: three files staged for deletion.

- [ ] **Step 6: Commit**

```bash
git add frontend/bun.lock frontend-react/bun.lock
git commit -m "build(frontend): adopt bun.lock, drop npm/pnpm lockfiles"
```

## Task 2: Point Vercel at Bun (both projects)

**Files:**
- Modify: `frontend/vercel.json`, `frontend-react/vercel.json`

- [ ] **Step 1: Update `frontend/vercel.json`**

Replace the file with:
```json
{
  "framework": "nextjs",
  "buildCommand": "bun run build",
  "installCommand": "bun install --frozen-lockfile",
  "regions": ["sin1"]
}
```

- [ ] **Step 2: Update `frontend-react/vercel.json`**

Replace the file with:
```json
{
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "installCommand": "bun install --frozen-lockfile",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "regions": ["sin1"]
}
```

- [ ] **Step 3: Verify the exact commands Vercel will run**

```bash
cd frontend-react && bun install --frozen-lockfile && bun run build
cd ../frontend && bun install --frozen-lockfile && bun run build
```
Expected: both succeed with no lockfile-mismatch error (proves `--frozen-lockfile` matches the committed `bun.lock`). The live check is a green Vercel preview deploy after the PR opens.

- [ ] **Step 4: Commit**

```bash
git add frontend/vercel.json frontend-react/vercel.json
git commit -m "ci(vercel): install + build both frontends with Bun"
```

## Task 3: Switch `frontend-react` Dockerfile to Bun

**Files:**
- Modify: `frontend-react/Dockerfile`

- [ ] **Step 1: Replace the build stage with Bun**

Replace the whole file with:
```dockerfile
# Build
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE
RUN bun run build

# Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Build the image**

```bash
cd frontend-react && docker build --build-arg VITE_API_BASE=https://example.com -t carmen-frontend-react:bun .
```
Expected: build succeeds through `bun run build` and the nginx stage.

- [ ] **Step 3: Commit**

```bash
git add frontend-react/Dockerfile
git commit -m "build(frontend-react): build Docker image with Bun"
```

## Task 4: Switch `frontend` Dockerfile install+build to Bun (runner stays Node)

**Files:**
- Modify: `frontend/Dockerfile`

- [ ] **Step 1: Replace deps + builder stages with Bun; keep the Node runner**

Replace the whole file with:
```dockerfile
# Install dependencies
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build (standalone bundle for Docker)
FROM oven/bun:1-alpine AS builder
WORKDIR /app
ARG DOCKER_BUILD=1
ARG NEXT_PUBLIC_API_BASE=https://knowledge-base-carmen-backend.onrender.com
ENV DOCKER_BUILD=$DOCKER_BUILD
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Run — Next standalone server runs on Node, not Bun (deliberate)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Next standalone may still require this helper at runtime.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@swc/helpers ./node_modules/@swc/helpers

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 2: Build the image**

```bash
cd frontend && docker build -t carmen-frontend:bun .
```
Expected: build succeeds through `bun run build`; final image is `node:20-alpine` running `node server.js`.

- [ ] **Step 3: Smoke-run the container**

```bash
docker run --rm -d -p 3000:3000 --name carmen-fe-bun carmen-frontend:bun
sleep 3 && curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost:3000 ; docker rm -f carmen-fe-bun
```
Expected: HTTP `200` (Next standalone server boots on Node).

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile
git commit -m "build(frontend): install+build with Bun, run standalone on Node"
```

## Task 5: Update `run_dev.sh` to launch the frontends with Bun

**Files:**
- Modify: `run_dev.sh:53-61` (the two frontend launch blocks)

- [ ] **Step 1: Edit the Next.js launch block**

Change line 55 from:
```bash
( cd "$ROOT/frontend" && npm run dev ) &
```
to:
```bash
( cd "$ROOT/frontend" && bun run dev ) &
```

- [ ] **Step 2: Edit the React SPA launch block**

Change line 60 from:
```bash
( cd "$ROOT/frontend-react" && VITE_API_BASE="http://localhost:8080" npm run dev ) &
```
to:
```bash
( cd "$ROOT/frontend-react" && VITE_API_BASE="http://localhost:8080" bun run dev ) &
```

- [ ] **Step 3: Verify both dev servers come up under Bun**

In one terminal:
```bash
cd frontend && bun run dev
```
Expected: Next dev server on `http://localhost:3000`. In a second terminal:
```bash
cd frontend-react && VITE_API_BASE="http://localhost:8080" bun run dev
```
Expected: Vite dev server on `http://localhost:5173`. Stop both with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add run_dev.sh
git commit -m "chore(dev): run_dev.sh launches both frontends with Bun"
```

**PR1 is complete. Open the PR; confirm Vercel preview deploys are green for both projects before merging.**

---

# PR2 — `frontend-react`: Vitest → `bun test`

Branch: `feat/bun-frontend-react-tests` (from `main` after PR1 merges).

## Task 6: Build the `bun test` harness and validate on one file

**Files:**
- Create: `frontend-react/bunfig.toml`
- Rewrite: `frontend-react/src/test/setup.ts`
- Modify: `frontend-react/package.json` (add devDep `@happy-dom/global-registrator`)
- Migrate (spike): `frontend-react/src/lib/config.test.ts`

**Interfaces:**
- Produces: a preloaded test environment (happy-dom DOM + jest-dom matchers + `import.meta.env` dev shim) that every other `frontend-react` test relies on. No exported symbols.

- [ ] **Step 1: Add the happy-dom registrator dependency**

```bash
cd frontend-react && bun add -d @happy-dom/global-registrator
```
Expected: added under `devDependencies`; `bun.lock` updated.

- [ ] **Step 2: Create `frontend-react/bunfig.toml`**

```toml
[test]
preload = ["./src/test/setup.ts"]
```

- [ ] **Step 3: Rewrite `frontend-react/src/test/setup.ts`**

Replace the whole file with:
```ts
import { expect } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";

// Register a DOM before any test imports a component.
GlobalRegistrator.register();

// jest-dom matchers (toBeInTheDocument, etc.) on bun:test's expect.
expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);

// Vite injects these; bun test does not. Mirror dev defaults so config.ts behaves.
const env = (import.meta as unknown as { env: Record<string, unknown> }).env;
env.MODE = "test";
env.DEV = true;
env.PROD = false;

// jsdom/happy-dom gaps used by framer-motion's viewport feature.
if (typeof window.IntersectionObserver === "undefined") {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

// matchMedia, used by next-themes.
if (typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
```

- [ ] **Step 4: Migrate the spike test `src/lib/config.test.ts`**

Change line 1 only, from:
```ts
import { describe, it, expect } from "vitest";
```
to:
```ts
import { describe, it, expect } from "bun:test";
```

- [ ] **Step 5: Run the spike file with `bun test`**

```bash
cd frontend-react && bun test src/lib/config.test.ts
```
Expected: 3 tests pass — proving preload (DOM + matchers + env shim) loads and `config.ts`'s `import.meta.env` reads behave as dev (localhost fallback).

- [ ] **Step 6: Commit**

```bash
git add frontend-react/bunfig.toml frontend-react/src/test/setup.ts frontend-react/src/lib/config.test.ts frontend-react/package.json frontend-react/bun.lock
git commit -m "test(frontend-react): bun test harness (happy-dom + jest-dom) + config spike"
```

## Task 7: Migrate the mock-free `lib`/component tests

These files import only test functions from `vitest` (no `vi.*`). Transform: change the import source `"vitest"` → `"bun:test"`. Nothing else.

**Files (migrate each; import-source change only):**
- `frontend-react/src/lib/locale.test.ts` — `import { describe, it, expect, beforeEach } from "bun:test";`
- `frontend-react/src/lib/dompurify-security.test.ts`
- `frontend-react/src/lib/url-safety.test.ts`
- `frontend-react/src/lib/wiki-route-security.test.ts`
- `frontend-react/src/i18n/use-translations.test.tsx` — `import { describe, it, expect, beforeAll } from "bun:test";`
- `frontend-react/src/components/chat/carmen-message.export.test.tsx`
- `frontend-react/src/routes/not-found.test.tsx`

(`src/routes/faq/index.test.tsx` uses `vi.*` — it is **not** here; it belongs to Task 8.)

**Interfaces:**
- Consumes: the Task 6 preload harness.

- [ ] **Step 1: In each file above, replace the `from "vitest"` import with `from "bun:test"`**

Keep the named imports exactly as they are (e.g. `describe, it, expect, beforeEach` / `beforeAll`); only the module string changes.

- [ ] **Step 2: Run the migrated files**

```bash
cd frontend-react && bun test src/lib src/i18n src/routes/not-found.test.tsx src/components/chat/carmen-message.export.test.tsx
```
Expected: all of these pass. (If a `.test.tsx` here renders a component that pulls `@/lib/wiki-api`, it does not mock it — confirm it still passes; if it fails on a network/api call, it belongs in Task 8 — move it there and mock the module.)

- [ ] **Step 3: Commit**

```bash
git add frontend-react/src/lib frontend-react/src/i18n frontend-react/src/routes/not-found.test.tsx frontend-react/src/components/chat/carmen-message.export.test.tsx
git commit -m "test(frontend-react): migrate mock-free suites to bun:test"
```

## Task 8: Migrate the `vi.mock` tests to `mock.module`

These files mock `@/lib/wiki-api`. Two transforms: (1) imports, (2) hoisting. Because `vi.mock` is hoisted but Bun's `mock.module` is **not**, the module-under-test must be imported **dynamically after** the `mock.module` call.

**Transform rules:**
- `import { describe, it, expect, vi } from "vitest";` → `import { describe, it, expect, mock, jest } from "bun:test";` (keep any extra hooks like `beforeEach`).
- `vi.mock("@/lib/wiki-api", factory)` → `mock.module("@/lib/wiki-api", factory)`.
- `vi.fn()` → `jest.fn()` (Bun's `jest.fn()` supports `.mockResolvedValue`/`.mockReturnValue`).
- Any static `import { X } from "./router"` (or other module that transitively imports the mocked module) becomes `const { X } = await import("./router");` placed **after** the `mock.module` call.

**Files:**
- `frontend-react/src/router.test.tsx`
- `frontend-react/src/routes/home.test.tsx`
- `frontend-react/src/routes/activity.test.tsx`
- `frontend-react/src/routes/chat.test.tsx`
- `frontend-react/src/routes/categories/index.test.tsx`
- `frontend-react/src/routes/categories/category.test.tsx`
- `frontend-react/src/routes/categories/article.test.tsx`
- `frontend-react/src/routes/faq/index.test.tsx`

(These are exactly the 8 files `grep -rl "vi\." src --include="*.test.*"` lists — cross-check before migrating.)

**Interfaces:**
- Consumes: the Task 6 preload harness.

- [ ] **Step 1: Rewrite `src/router.test.tsx` as the reference implementation**

Replace the whole file with:
```tsx
import { describe, it, expect, mock, jest } from "bun:test";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

mock.module("@/lib/wiki-api", () => ({
  getBusinessUnits: jest.fn().mockResolvedValue({ items: [] }),
  getSelectedBUClient: jest.fn().mockReturnValue("carmen"),
  setSelectedBU: jest.fn(),
  getSidebarTree: jest.fn().mockResolvedValue([]),
  getCategories: jest.fn().mockResolvedValue({ items: [] }),
  getAllArticles: jest.fn().mockResolvedValue([]),
  searchWiki: jest.fn().mockResolvedValue([]),
  clearWikiClientCaches: jest.fn(),
  invalidateSidebarCache: jest.fn(),
}));

const { routes } = await import("./router");

describe("router", () => {
  it("renders the home route at /", async () => {
    const r = createMemoryRouter(routes, { initialEntries: ["/"] });
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
  it("renders not-found for unknown path", async () => {
    const r = createMemoryRouter(routes, { initialEntries: ["/nope"] });
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("heading")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the reference file**

```bash
cd frontend-react && bun test src/router.test.tsx
```
Expected: 2 tests pass. If `mock.module("@/lib/wiki-api", …)` does not intercept (component still hits the real api), change the specifier to the path the consuming module actually uses (resolve `@/lib/wiki-api` → `./src/lib/wiki-api`) and re-run.

- [ ] **Step 3: Apply the same transform to the remaining 6 files**

For each of `routes/home`, `routes/activity`, `routes/chat`, `routes/categories/index`, `routes/categories/category`, `routes/categories/article`, `routes/faq/index`: swap the imports, `vi.mock`→`mock.module`, `vi.fn`→`jest.fn`, and convert the static import of the component/route-under-test to `const { X } = await import("…")` after the mock. Preserve every assertion body unchanged.

- [ ] **Step 4: Run the full suite**

```bash
cd frontend-react && bun test
```
Expected: all 16 test files pass (parity with the prior Vitest run).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src
git commit -m "test(frontend-react): migrate vi.mock suites to bun mock.module"
```

## Task 9: Make `bun test` the default and remove Vitest

**Files:**
- Modify: `frontend-react/package.json` (scripts + remove `vitest`)
- Modify: `frontend-react/vite.config.ts` (drop the `test` block)
- Modify: `frontend-react/tsconfig.json` (drop `vitest/globals` from `types`)

- [ ] **Step 1: Update `package.json` scripts and drop the Vitest dep**

In `frontend-react/package.json`, set:
```json
    "test": "bun test",
    "test:watch": "bun test --watch",
```
Then remove Vitest:
```bash
cd frontend-react && bun remove vitest
```
Expected: `vitest` gone from `devDependencies`; `bun.lock` updated. (`jsdom` may also be removed if no test imports it: `bun remove jsdom` — keep it only if a test still references jsdom directly.)

- [ ] **Step 2: Drop the `test` block from `vite.config.ts`**

Replace the file with:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Drop `vitest/globals` from `tsconfig.json` `types`**

Change the `types` line from:
```json
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom", "node"],
```
to:
```json
    "types": ["vite/client", "@testing-library/jest-dom", "node"],
```

- [ ] **Step 4: Verify build + test + typecheck still pass**

```bash
cd frontend-react && bun run build && bun test
```
Expected: `tsc -b && vite build` succeeds (no missing `vitest/globals` type error) and `bun test` passes all 16 files.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/package.json frontend-react/vite.config.ts frontend-react/tsconfig.json frontend-react/bun.lock
git commit -m "test(frontend-react): default to bun test, remove Vitest"
```

**PR2 is complete. Open the PR; confirm the Vercel preview deploy is green before merging.**

---

# PR3 — `frontend`: Jest → `bun test`

Branch: `feat/bun-frontend-next-tests` (from `main` after PR2 merges).

The 5 test files (`__tests__/*.test.ts`) use Jest globals and no mocks, so their bodies need no edits — only the runner config changes.

## Task 10: Replace Jest with `bun test`

**Files:**
- Create: `frontend/bunfig.toml`, `frontend/test-setup.ts`
- Modify: `frontend/package.json` (scripts + remove Jest toolchain, add `@happy-dom/global-registrator`)
- Delete: `frontend/jest.config.mjs`, `frontend/jest.setup.ts`

**Interfaces:**
- Consumes: Bun's auto-read `tsconfig.json` `paths` for the `@/` alias (replaces the Jest `moduleNameMapper`).

- [ ] **Step 1: Add the happy-dom registrator**

```bash
cd frontend && bun add -d @happy-dom/global-registrator
```
Expected: added under `devDependencies`; `bun.lock` updated.

- [ ] **Step 2: Create `frontend/bunfig.toml`**

```toml
[test]
preload = ["./test-setup.ts"]
```

- [ ] **Step 3: Create `frontend/test-setup.ts`**

```ts
import { expect } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";

// DOMPurify and the security tests need a window/document.
GlobalRegistrator.register();

// jest-dom matchers on bun:test's expect.
expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);
```

- [ ] **Step 4: Point the test script at `bun test` (scoped to `__tests__`)**

In `frontend/package.json`, set:
```json
    "test": "bun test __tests__",
    "test:watch": "bun test __tests__ --watch",
```

- [ ] **Step 5: Run the suite before removing Jest (proves the harness works)**

```bash
cd frontend && bun test __tests__
```
Expected: all 5 files pass (`ssrf-guard`, `url-safety`, `wiki-route-security`, `dompurify-security`, `export-images`). The `dompurify-security` test proves happy-dom's DOM is registered.

- [ ] **Step 6: Remove the Jest toolchain and its config files**

```bash
cd frontend && bun remove jest jest-environment-jsdom babel-jest @babel/core
git rm frontend/jest.config.mjs frontend/jest.setup.ts
```
Expected: Jest deps gone from `devDependencies`; both config files deleted. (`@testing-library/react`/`@testing-library/user-event` may be removed too if no `__tests__` file imports them: confirm with `grep -rl "@testing-library/react" frontend/__tests__` first — these are lib/DOM tests, so they likely can go.)

- [ ] **Step 7: Re-run to confirm nothing depended on the removed packages**

```bash
cd frontend && bun test __tests__ && bun run build
```
Expected: 5 files still pass; `next build` still succeeds.

- [ ] **Step 8: Commit**

```bash
git add frontend/bunfig.toml frontend/test-setup.ts frontend/package.json frontend/bun.lock
git commit -m "test(frontend): migrate Jest suite to bun test"
```

**PR3 is complete. Open the PR; confirm the Vercel preview deploy is green before merging.**

---

## Final verification checklist (after all three PRs merge)

- [ ] `frontend/bun.lock` and `frontend-react/bun.lock` are the only lockfiles; no `package-lock.json`/`pnpm-lock.yaml` remain.
- [ ] `bun install && bun run build && bun test` pass in both projects.
- [ ] `./run_dev.sh` brings up the backend + both frontends, with the frontends launched via `bun run dev`.
- [ ] `docker build` succeeds for `frontend-react` (Bun→nginx) and `frontend` (Bun build → Node runner), and the `frontend` container answers `200` on `/`.
- [ ] Vercel deploys both projects using `bun install --frozen-lockfile` + `bun run build`.
