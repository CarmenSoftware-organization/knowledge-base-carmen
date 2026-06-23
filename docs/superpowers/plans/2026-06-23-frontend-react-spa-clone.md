# Frontend React SPA Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `frontend-react/` — a Vite + React Router v7 SPA that faithfully clones the existing Next.js `frontend/`, talking only to the Go backend, to eventually replace `frontend/` in production.

**Architecture:** Pure client-side SPA. All data comes from the Go backend via `lib/wiki-api.ts` (`fetch` + `API_BASE`). Next.js server-component data loading becomes React Router `loader`s; `next-intl` becomes `react-i18next` behind a compat wrapper; `next/headers` cookies become `document.cookie` reads; the two `app/api/export/*` server routes are dropped and the chat export buttons point at the Go backend (`${API_BASE}/api/export/*`, a separate backend dependency). Everything else (`components/**`, most of `lib/**`, `hooks/**`, `configs/**`) is framework-agnostic React and ports nearly verbatim — copy + fix `next/*` imports.

**Tech Stack:** Vite 7, React 19, TypeScript, React Router v7 (data router), react-i18next + i18next, Tailwind v4 (via `@tailwindcss/vite`), Radix UI, next-themes, Vitest + Testing Library + jsdom, `@fontsource/geist`.

## Global Constraints

- **Source of truth for ports:** the existing `frontend/` directory. Kept dependencies must use the **same versions** already in `frontend/package.json` (do not silently upgrade).
- **Path alias:** `@/` → `frontend-react/src/` (matches the original `@/` → repo `frontend/` root, but rooted at `src/`). Every ported import that was `@/components/...`, `@/lib/...`, `@/hooks/...`, `@/configs/...` stays valid because those folders move under `src/`.
- **No SSR, no SEO work** — internal tool.
- **No filesystem reads** — all content via Go backend; `API_BASE` from `lib/config.ts`.
- **Env vars:** `VITE_API_BASE`, `VITE_USE_REMOTE_API` (replace `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_USE_REMOTE_API`). Access via `import.meta.env.*`.
- **Default BU:** `"carmen"`. **Locale cookie:** `NEXT_LOCALE` (unchanged). **BU cookie:** `selected_bu` (unchanged).
- **Slug regex (unchanged):** `^[a-zA-Z_][a-zA-Z0-9_]*$` (no dashes).
- **`_`-prefix convention** for intentionally-unused vars/args/catch (eslint rule, ported).
- **Removed deps (do not add):** `next`, `next-intl`, `eslint-config-next`, `puppeteer`, `jspdf`, `html2canvas`, `html-to-docx`, `three`, `@react-three/fiber`, `cohere-ai`, `@vercel/analytics`, `autoprefixer`, `postcss`, `@tailwindcss/postcss`, `babel-jest`, `jest`, `jest-environment-jsdom`, `next/jest`.
- **Kept deps (frameworks-agnostic):** `next-themes`, `react-markdown` + all `remark-*`/`rehype-*`, `mermaid`, `dompurify`, `fuse.js`, `gray-matter`, all `@radix-ui/*`, `react-hook-form`, `@hookform/resolvers`, `zod`, `recharts`, `date-fns`, `react-day-picker`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `cmdk`, `sonner`, `vaul`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `framer-motion`, `tailwindcss`, `tw-animate-css`, `tailwindcss-animate`.

---

## File Structure

New files under `frontend-react/` (glue, written fresh):

| File | Responsibility |
|---|---|
| `index.html` | SPA entry; favicon links; mounts `#root` |
| `vite.config.ts` | React plugin, Tailwind plugin, `@/` alias, Vitest config |
| `tsconfig.json` / `tsconfig.node.json` | TS config with `@/*` paths |
| `package.json` | deps per Global Constraints |
| `eslint.config.mjs` | flat config (typescript-eslint, no Next) |
| `.env.example` | `VITE_API_BASE`, `VITE_USE_REMOTE_API` |
| `vercel.json` | SPA rewrite all paths → `/index.html` |
| `Dockerfile` + `nginx.conf` | build static → serve via nginx |
| `src/main.tsx` | ReactDOM root; imports CSS + fonts; renders `<RouterProvider>` |
| `src/router.tsx` | `createBrowserRouter` route tree + loaders |
| `src/root-layout.tsx` | providers (`ThemeProvider`, i18n) + `<Outlet/>` + `<FloatingChatBot/>` |
| `src/vite-env.d.ts` | `ImportMetaEnv` typing |
| `src/i18n/index.ts` | i18next init |
| `src/i18n/use-translations.ts` | next-intl compat wrapper (`useTranslations`, `useLocale`) |
| `src/lib/config.ts` | rewritten for `import.meta.env` |
| `src/routes/*.tsx` | 10 route modules (see Phase 6) |

Ported folders (copied from `frontend/`, imports fixed): `src/components/`, `src/lib/` (minus `export-images.ts`, `ssrf-guard.ts`), `src/hooks/`, `src/configs/`, `src/messages/`, `src/styles/globals.css`, `public/`.

---

## Phase 0 — Scaffold

### Task 1: Initialize the Vite + TS + Tailwind + Vitest project

**Files:**
- Create: `frontend-react/package.json`
- Create: `frontend-react/index.html`
- Create: `frontend-react/vite.config.ts`
- Create: `frontend-react/tsconfig.json`, `frontend-react/tsconfig.node.json`
- Create: `frontend-react/src/main.tsx`, `frontend-react/src/App.tsx` (temporary), `frontend-react/src/vite-env.d.ts`
- Create: `frontend-react/eslint.config.mjs`
- Create: `frontend-react/.gitignore`

**Interfaces:**
- Produces: a runnable Vite app shell; `@/` alias resolving to `src/`; `npm run dev|build|lint|test` scripts.

- [ ] **Step 1: Create `frontend-react/package.json`**

```json
{
  "name": "carmen-frontend-react",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.4.0",
    "@radix-ui/react-accordion": "1.2.14",
    "@radix-ui/react-alert-dialog": "1.1.17",
    "@radix-ui/react-aspect-ratio": "1.1.10",
    "@radix-ui/react-avatar": "1.2.0",
    "@radix-ui/react-checkbox": "1.3.5",
    "@radix-ui/react-collapsible": "1.1.14",
    "@radix-ui/react-context-menu": "2.3.1",
    "@radix-ui/react-dialog": "1.1.17",
    "@radix-ui/react-dropdown-menu": "2.1.18",
    "@radix-ui/react-hover-card": "1.1.17",
    "@radix-ui/react-label": "2.1.10",
    "@radix-ui/react-menubar": "1.1.18",
    "@radix-ui/react-navigation-menu": "1.2.16",
    "@radix-ui/react-popover": "1.1.17",
    "@radix-ui/react-progress": "1.1.10",
    "@radix-ui/react-radio-group": "1.4.1",
    "@radix-ui/react-scroll-area": "1.2.12",
    "@radix-ui/react-select": "2.3.1",
    "@radix-ui/react-separator": "1.1.10",
    "@radix-ui/react-slider": "1.4.1",
    "@radix-ui/react-slot": "1.3.0",
    "@radix-ui/react-switch": "1.3.1",
    "@radix-ui/react-tabs": "1.1.15",
    "@radix-ui/react-toast": "1.2.17",
    "@radix-ui/react-toggle": "1.1.12",
    "@radix-ui/react-toggle-group": "1.1.13",
    "@radix-ui/react-tooltip": "1.2.10",
    "@fontsource/geist-sans": "^5.1.0",
    "@fontsource/geist-mono": "^5.1.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "1.1.1",
    "date-fns": "^4.4.0",
    "dompurify": "^3.4.11",
    "embla-carousel-react": "8.6.0",
    "framer-motion": "^12.40.0",
    "fuse.js": "^7.4.2",
    "gray-matter": "^4.0.3",
    "i18next": "^25.7.0",
    "input-otp": "1.4.2",
    "lucide-react": "^1.21.0",
    "mermaid": "^11.15.0",
    "next-themes": "^0.4.6",
    "react": "19.2.7",
    "react-day-picker": "10.0.1",
    "react-dom": "19.2.7",
    "react-hook-form": "^7.80.0",
    "react-i18next": "^16.2.0",
    "react-markdown": "^10.1.0",
    "react-resizable-panels": "^4.11.2",
    "react-router-dom": "^7.9.0",
    "recharts": "3.8.1",
    "rehype-highlight": "^7.0.2",
    "rehype-raw": "^7.0.0",
    "rehype-sanitize": "^6.0.0",
    "rehype-slug": "^6.0.0",
    "remark-breaks": "^4.0.0",
    "remark-emoji": "^5.0.2",
    "remark-gfm": "^4.0.1",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.6.0",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@tailwindcss/vite": "^4.3.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/dompurify": "^3.2.0",
    "@types/node": "^26",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^5.0.0",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^6.1.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.0.0",
    "jsdom": "^27.0.0",
    "tailwindcss": "^4.3.1",
    "tw-animate-css": "1.4.0",
    "typescript": "^6",
    "typescript-eslint": "^8.20.0",
    "vite": "^7.0.0",
    "vitest": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `frontend-react/index.html`**

```html
<!doctype html>
<html lang="th" suppressHydrationWarning>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Carmen Knowledge Base</title>
    <meta name="description" content="ศูนย์รวมความรู้และคู่มือการใช้งานสำหรับ Carmen Chatbot" />
    <link rel="icon" type="image/png" sizes="32x32" href="/carmen-favicon-circle-32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/carmen-favicon-circle-16.png" />
    <link rel="apple-touch-icon" href="/carmen-favicon-circle-180.png" />
  </head>
  <body class="font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `frontend-react/vite.config.ts`** (alias + tailwind + vitest)

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
```

- [ ] **Step 4: Create `frontend-react/tsconfig.json` and `tsconfig.node.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create `frontend-react/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_USE_REMOTE_API?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 6: Create temporary `frontend-react/src/App.tsx` and `src/main.tsx`** (replaced in Phase 3)

`src/App.tsx`:
```tsx
export default function App() {
  return <div data-testid="app-shell">frontend-react scaffold OK</div>;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Create `frontend-react/eslint.config.mjs`**

```js
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
);
```

- [ ] **Step 8: Create `frontend-react/.gitignore`**

```
node_modules
dist
.env
.env.local
*.local
```

- [ ] **Step 9: Install dependencies**

Run: `cd frontend-react && npm install`
Expected: completes without peer-dep errors that abort install.

- [ ] **Step 10: Create test setup file so Vitest runs**

Create `frontend-react/src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 11: Verify dev server, build, lint all work**

Run: `cd frontend-react && npm run build`
Expected: `dist/` produced, exit 0.

Run: `cd frontend-react && npm run lint`
Expected: exit 0, no errors.

Run: `cd frontend-react && npm run dev` (then Ctrl-C)
Expected: prints a `localhost:5173` URL with no error.

- [ ] **Step 12: Commit**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/knowledge-base-carmen
git add frontend-react
git commit -m "chore(frontend-react): scaffold Vite + TS + Tailwind + Vitest shell"
```

---

## Phase 1 — Styling & static assets

### Task 2: Port Tailwind v4 global styles, fonts, and public assets

**Files:**
- Copy: `frontend/public/**` → `frontend-react/public/`
- Copy: `frontend/app/globals.css` → `frontend-react/src/styles/globals.css`
- Modify: `frontend-react/src/styles/globals.css` (font + import adjustments)
- Modify: `frontend-react/src/main.tsx` (import CSS + fonts)

**Interfaces:**
- Produces: global Tailwind layer + theme CSS variables available app-wide; Geist fonts loaded.

- [ ] **Step 1: Copy public assets and globals.css**

Run:
```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/knowledge-base-carmen
cp -R frontend/public/. frontend-react/public/
mkdir -p frontend-react/src/styles
cp frontend/app/globals.css frontend-react/src/styles/globals.css
```

- [ ] **Step 2: Inspect the top of `globals.css` for Next/font references**

Run: `head -30 frontend-react/src/styles/globals.css`
Look for `@import "tailwindcss";`, `@import "tw-animate-css";`, and any `--font-*` variables referencing `next/font` (`var(--font-geist-sans)` etc.). With `@tailwindcss/vite`, keep `@import "tailwindcss";` as-is.

- [ ] **Step 3: Replace `next/font` CSS variables with `@fontsource` family names**

If `globals.css` (or a `@theme`/`:root` block) sets `--font-sans`/`--font-mono` to `next/font` variables, set them to literal families. Edit the relevant declarations to:
```css
:root {
  --font-sans: "Geist Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;
}
```
(If `globals.css` already uses literal `font-family` values, leave it unchanged.)

- [ ] **Step 4: Import CSS + fonts in `main.tsx`**

Edit `frontend-react/src/main.tsx` to add, at the very top (before component imports):
```tsx
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@/styles/globals.css";
```
Note: the package names in `package.json` are `@fontsource/geist-sans` / `@fontsource/geist-mono`; if the variable builds are preferred use `@fontsource-variable/*`. Use whichever import path resolves after install — verify with the next step.

- [ ] **Step 5: Verify styles + fonts resolve**

Run: `cd frontend-react && npm run build`
Expected: build succeeds; no "failed to resolve import" for fonts or CSS. If a font import path errors, switch between `@fontsource/geist-sans` and `@fontsource-variable/geist` to match the installed package and update `package.json` + `main.tsx` together.

- [ ] **Step 6: Smoke-test Tailwind is active** (temporary)

Edit `src/App.tsx` body to `<div className="m-4 rounded bg-primary p-4 text-primary-foreground">tw ok</div>`, run `npm run dev`, confirm the box is styled, then revert `App.tsx` to the scaffold text.

- [ ] **Step 7: Commit**

```bash
git add frontend-react
git commit -m "feat(frontend-react): tailwind v4 globals, geist fonts, public assets"
```

---

## Phase 2 — Glue: config, locale, i18n

### Task 3: Port `lib/config.ts` to Vite env (TDD)

**Files:**
- Create: `frontend-react/src/lib/config.ts`
- Test: `frontend-react/src/lib/config.test.ts`

**Interfaces:**
- Produces: `export const API_BASE: string` (no trailing slash), `export const DEFAULT_BU = "carmen"`.

- [ ] **Step 1: Write the failing test**

`src/lib/config.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("config", () => {
  it("strips trailing slashes from API_BASE", async () => {
    const mod = await import("./config");
    expect(mod.API_BASE.endsWith("/")).toBe(false);
  });
  it("exposes DEFAULT_BU = carmen", async () => {
    const mod = await import("./config");
    expect(mod.DEFAULT_BU).toBe("carmen");
  });
  it("falls back to localhost when VITE_API_BASE unset in dev", async () => {
    const mod = await import("./config");
    expect(mod.API_BASE).toMatch(/^https?:\/\//);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/lib/config.test.ts`
Expected: FAIL — cannot resolve `./config`.

- [ ] **Step 3: Write `src/lib/config.ts`**

```ts
const fallbackApiBase = "http://localhost:8080";

const envApiBase = import.meta.env.VITE_API_BASE?.trim();
const useRemoteApiInDev = import.meta.env.VITE_USE_REMOTE_API === "true";
const isProduction = import.meta.env.PROD;

const localhostRe = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i;

const isInvalidProdLocalhost =
  isProduction &&
  !!envApiBase &&
  localhostRe.test(envApiBase.replace(/\/+$/, ""));

const isDevRemoteApi =
  !isProduction &&
  !!envApiBase &&
  /^https?:\/\//i.test(envApiBase) &&
  !localhostRe.test(envApiBase.replace(/\/+$/, ""));

const raw = isProduction
  ? isInvalidProdLocalhost
    ? fallbackApiBase
    : envApiBase || fallbackApiBase
  : isDevRemoteApi && !useRemoteApiInDev
    ? fallbackApiBase
    : envApiBase || fallbackApiBase;

if (isProduction && !envApiBase) {
  throw new Error(
    "VITE_API_BASE is required in production build (set as Docker build arg).",
  );
}

/** No trailing slash — avoids `//api/...` when building URLs */
export const API_BASE = raw.replace(/\/+$/, "");
export const DEFAULT_BU = "carmen";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/lib/config.test.ts`
Expected: PASS (3 tests). (Vitest sets `import.meta.env.PROD=false`, so the prod-throw branch is not hit.)

- [ ] **Step 5: Create `.env.example`**

`frontend-react/.env.example`:
```
# Base URL of the Go backend
VITE_API_BASE=http://localhost:8080
# Set to "true" in dev to use a remote API base instead of localhost
VITE_USE_REMOTE_API=false
```

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/lib/config.ts frontend-react/src/lib/config.test.ts frontend-react/.env.example
git commit -m "feat(frontend-react): config.ts on import.meta.env (VITE_API_BASE)"
```

### Task 4: Port `lib/locale.ts` (browser cookie helpers)

**Files:**
- Create: `frontend-react/src/lib/locale.ts`
- Test: `frontend-react/src/lib/locale.test.ts`

**Interfaces:**
- Produces: `setLocaleCookie(locale: string): void`, `getLocaleFromClient(): string` (default `"th"`), cookie name `NEXT_LOCALE`, fires `window` event `"locale-changed"`.

- [ ] **Step 1: Write the failing test**

`src/lib/locale.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setLocaleCookie, getLocaleFromClient } from "./locale";

beforeEach(() => {
  document.cookie = "NEXT_LOCALE=; max-age=0; path=/";
});

describe("locale", () => {
  it("defaults to th when no cookie", () => {
    expect(getLocaleFromClient()).toBe("th");
  });
  it("round-trips a set locale", () => {
    setLocaleCookie("en");
    expect(getLocaleFromClient()).toBe("en");
  });
  it("dispatches locale-changed on set", () => {
    let fired = false;
    window.addEventListener("locale-changed", () => (fired = true), { once: true });
    setLocaleCookie("th");
    expect(fired).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/lib/locale.test.ts`
Expected: FAIL — cannot resolve `./locale`.

- [ ] **Step 3: Copy `lib/locale.ts` verbatim**

Run: `cp frontend/lib/locale.ts frontend-react/src/lib/locale.ts`
(The file uses only `document.cookie` / `window` — no `next/*` imports — so it ports as-is.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/lib/locale.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/lib/locale.ts frontend-react/src/lib/locale.test.ts
git commit -m "feat(frontend-react): port locale.ts cookie helpers"
```

### Task 5: i18n setup + next-intl compat wrapper (TDD)

**Files:**
- Copy: `frontend/messages/en.json`, `frontend/messages/th.json` → `frontend-react/src/messages/`
- Create: `frontend-react/src/i18n/index.ts`
- Create: `frontend-react/src/i18n/use-translations.ts`
- Test: `frontend-react/src/i18n/use-translations.test.tsx`

**Interfaces:**
- Consumes: `getLocaleFromClient` from `@/lib/locale`.
- Produces:
  - `useTranslations(namespace?: string)` → returns `t(key: string, values?: Record<string, unknown>) => string`. When `namespace` given, `t("x")` looks up `"<namespace>.x"`; key resolution and interpolation match next-intl call sites (e.g. `t("common.home")` with no namespace, or `useTranslations("notFound")` + `t("title")`).
  - `useLocale(): string`.
  - default export from `@/i18n` is the initialized `i18next` instance.

- [ ] **Step 1: Copy message files and scan for ICU plurals**

Run:
```bash
mkdir -p frontend-react/src/messages
cp frontend/messages/en.json frontend-react/src/messages/en.json
cp frontend/messages/th.json frontend-react/src/messages/th.json
grep -nE "\{[^}]*, *(plural|select|selectordinal) *," frontend-react/src/messages/en.json frontend-react/src/messages/th.json
```
Record each ICU plural string (there are ~4 in en, ~2 in th).

- [ ] **Step 2: Write the failing test**

`src/i18n/use-translations.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTranslations } from "./use-translations";

describe("useTranslations compat", () => {
  it("resolves a dotted key without namespace", () => {
    const { result } = renderHook(() => useTranslations());
    expect(result.current("common.home")).toBe("Home");
  });
  it("prefixes the namespace", () => {
    const { result } = renderHook(() => useTranslations("common"));
    expect(result.current("home")).toBe("Home");
  });
});
```
(Assumes `messages/en.json` has `common.home = "Home"`, confirmed in the source. The test runs with default locale; ensure i18next initializes to `en` for the test by setting the cookie in the test if needed — add `beforeEach(() => { document.cookie = "NEXT_LOCALE=en; path=/"; })` if the default resolves to `th`.)

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/i18n/use-translations.test.tsx`
Expected: FAIL — cannot resolve `./use-translations`.

- [ ] **Step 4: Write `src/i18n/index.ts`**

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/messages/en.json";
import th from "@/messages/th.json";
import { getLocaleFromClient } from "@/lib/locale";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, th: { translation: th } },
    lng: getLocaleFromClient(),
    fallbackLng: "th",
    interpolation: { escapeValue: false },
    keySeparator: ".",
    nsSeparator: false,
    returnNull: false,
  });
}

// Keep i18next in sync when the locale cookie changes.
if (typeof window !== "undefined") {
  window.addEventListener("locale-changed", () => {
    const next = getLocaleFromClient();
    if (next !== i18n.language) void i18n.changeLanguage(next);
    document.documentElement.lang = next;
  });
}

export default i18n;
```

- [ ] **Step 5: Write `src/i18n/use-translations.ts`** (compat wrapper)

```ts
import { useTranslation } from "react-i18next";
import "@/i18n";

/** next-intl-compatible hook. `useTranslations("ns")` then `t("key")` → "ns.key". */
export function useTranslations(namespace?: string) {
  const { t } = useTranslation();
  return (key: string, values?: Record<string, unknown>): string => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return t(fullKey, values ?? {}) as string;
  };
}

export function useLocale(): string {
  const { i18n } = useTranslation();
  return i18n.language;
}
```

- [ ] **Step 6: Convert ICU plurals recorded in Step 1**

For each ICU string `"{count, plural, one {# item} other {# items}}"`, replace the single key with i18next plural keys and update call sites later (the wrapper passes `values`, so `t("key", { count })` selects the suffix). Example edit in both `en.json` and `th.json`:
```jsonc
// before:  "results": "{count, plural, one {# result} other {# results}}"
// after:
"results_one": "{{count}} result",
"results_other": "{{count}} results"
```
For Thai (no plural category distinction) use the same text for `_one` and `_other`. Note the call site must pass `{ count }`; verify each converted key's call site in Phase 5/6 ports.

- [ ] **Step 7: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/i18n/use-translations.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/i18n frontend-react/src/messages
git commit -m "feat(frontend-react): react-i18next setup + next-intl compat wrapper"
```

---

## Phase 3 — Providers, root layout, router skeleton

### Task 6: Theme provider, root layout, router with placeholder routes

**Files:**
- Copy: `frontend/components/theme-provider.tsx` → `frontend-react/src/components/theme-provider.tsx`
- Create: `frontend-react/src/root-layout.tsx`
- Create: `frontend-react/src/router.tsx`
- Modify: `frontend-react/src/main.tsx`
- Delete: `frontend-react/src/App.tsx`
- Test: `frontend-react/src/router.test.tsx`

**Interfaces:**
- Consumes: `useTranslations` (`@/i18n/use-translations`), `ThemeProvider` (`@/components/theme-provider`).
- Produces: `router` (a `createBrowserRouter` instance) exported from `@/router`; `RootLayout` from `@/root-layout`.

- [ ] **Step 1: Copy theme-provider**

Run: `cp frontend/components/theme-provider.tsx frontend-react/src/components/theme-provider.tsx`
Open it; it imports from `next-themes` (kept). No change needed unless it imports `next/*` — if it does, apply the replacement table from Task 9 Step 2.

- [ ] **Step 2: Write the failing router test**

`src/router.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { routes } from "./router";

describe("router", () => {
  it("renders the home route at /", async () => {
    const r = createMemoryRouter(routes, { initialEntries: ["/"] });
    render(<RouterProvider router={r} />);
    expect(await screen.findByTestId("route-home")).toBeInTheDocument();
  });
  it("renders not-found for unknown path", async () => {
    const r = createMemoryRouter(routes, { initialEntries: ["/nope"] });
    render(<RouterProvider router={r} />);
    expect(await screen.findByTestId("route-not-found")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/router.test.tsx`
Expected: FAIL — cannot resolve `./router`.

- [ ] **Step 4: Write `src/root-layout.tsx`**

```tsx
import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import "@/i18n";

export default function RootLayout() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Outlet />
      {/* <FloatingChatBot /> is wired in Phase 7 */}
    </ThemeProvider>
  );
}
```
(Match the `ThemeProvider` props to those used in `frontend/app/layout.tsx` / the original `theme-provider.tsx` defaults; adjust if the original passes different props.)

- [ ] **Step 5: Write `src/router.tsx`** with placeholder route elements

```tsx
import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import RootLayout from "@/root-layout";

const ph = (id: string) => <div data-testid={`route-${id}`} />;

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: ph("home") },
      { path: "categories", element: ph("categories") },
      { path: "categories/:category", element: ph("category") },
      { path: "categories/:category/*", element: ph("article") },
      { path: "faq", element: ph("faq") },
      { path: "faq/*", element: ph("faq-path") },
      { path: "activity", element: ph("activity") },
      { path: "admin/activity", element: ph("admin-activity") },
      { path: "chat", element: ph("chat") },
      { path: "*", element: ph("not-found") },
    ],
  },
];

export const router = createBrowserRouter(routes);
```

- [ ] **Step 6: Rewrite `src/main.tsx` to use the router; delete `App.tsx`**

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@/styles/globals.css";
import { router } from "@/router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```
Run: `rm frontend-react/src/App.tsx`

- [ ] **Step 7: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/router.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 8: Verify dev + build**

Run: `cd frontend-react && npm run build`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add frontend-react/src
git commit -m "feat(frontend-react): theme provider, root layout, router skeleton"
```

---

## Phase 4 — Port portable code (lib, hooks, ui, configs)

> **Mechanical-port recipe (used by Tasks 7–12 and 21).** After copying a folder, fix framework imports with this exact replacement table, then make the directory typecheck.

| Find (import) | Replace with |
|---|---|
| `import Link from "next/link"` | `import { Link } from "react-router-dom"` |
| `<Link href={x}>` / `href="..."` (on `Link`) | `<Link to={x}>` / `to="..."` |
| `import Image from "next/image"` + `<Image .../>` | plain `<img .../>` (drop `next/image`; keep `src/alt/width/height/className`) |
| `import { useRouter } from "next/navigation"` + `useRouter()` | `import { useNavigate } from "react-router-dom"` + `const navigate = useNavigate()`; `router.push(x)` → `navigate(x)`; `router.replace(x)` → `navigate(x, { replace: true })`; `router.back()` → `navigate(-1)` |
| `usePathname()` (next/navigation) | `useLocation().pathname` (`import { useLocation } from "react-router-dom"`) |
| `useSearchParams()` (next/navigation) | `useSearchParams()` from `react-router-dom` (note: returns `[searchParams, setSearchParams]`) |
| `useParams()` (next/navigation) | `useParams()` from `react-router-dom`; catch-all `params.slug` arrays → `params["*"]` string |
| `import { useTranslations } from "next-intl"` | `import { useTranslations } from "@/i18n/use-translations"` |
| `import { useLocale } from "next-intl"` | `import { useLocale } from "@/i18n/use-translations"` |
| `import { useTranslations, useLocale } from "next-intl"` | split into the two imports above |
| `redirect(x)` (next/navigation, render path) | `import { Navigate } from "react-router-dom"` → `return <Navigate to={x} replace />` |

Server-only APIs (`getTranslations`, `getLocale` from `next-intl/server`; `cookies`/`headers` from `next/headers`) appear only in route pages — handled in Phase 6, not here.

### Task 7: Port `lib/**` (minus export-images, ssrf-guard)

**Files:**
- Copy: `frontend/lib/*.ts` → `frontend-react/src/lib/` (skip `export-images.ts`, `ssrf-guard.ts`, and the already-ported `config.ts`, `locale.ts`)
- Modify: ported `lib` files per the recipe

**Interfaces:**
- Produces: all `@/lib/*` modules (`wiki-api`, `utils`, `wiki-utils`, `faq-nav`, `faq-cache`, `changelog-utils`, `carmen-formatter`, `carmen-client-id`, `kb-scroll-chrome`, `url-safety`) with the same export signatures as `frontend/`.

- [ ] **Step 1: Copy lib files (excluding the four handled separately)**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/knowledge-base-carmen
for f in frontend/lib/*.ts; do
  base=$(basename "$f")
  case "$base" in
    config.ts|locale.ts|export-images.ts|ssrf-guard.ts) continue;;
  esac
  cp "$f" "frontend-react/src/lib/$base"
done
ls frontend-react/src/lib
```

- [ ] **Step 2: Find and fix any `next/*` or `next-intl` imports in lib**

Run: `grep -rn "next/\|next-intl" frontend-react/src/lib` 
Apply the recipe table to each hit. (`wiki-api.ts` uses only `fetch` + `fuse.js` + `@/config` — expect zero or few hits.)

- [ ] **Step 3: Confirm no references to dropped modules**

Run: `grep -rn "export-images\|ssrf-guard" frontend-react/src/lib`
Expected: no output. (If any lib file imports them, it must be a server-only helper — remove that import/usage; those modules belong to the export flow now in Go.)

- [ ] **Step 4: Typecheck the lib folder**

Run: `cd frontend-react && npx tsc --noEmit`
Expected: no errors originating in `src/lib/*` (errors from not-yet-ported components are fine to ignore at this step; if `tsc` is too noisy, scope by temporarily checking only via build later). 

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/lib
git commit -m "feat(frontend-react): port lib/* (drop export-images, ssrf-guard)"
```

### Task 8: Port `hooks/**` and `configs/**`

**Files:**
- Copy: `frontend/hooks/*` → `frontend-react/src/hooks/`
- Copy: `frontend/configs/*` → `frontend-react/src/configs/`
- Modify: per recipe

**Interfaces:**
- Produces: `@/hooks/use-carmen-api`, `@/hooks/use-carmen-chat`, `@/hooks/use-chat-stream`, `@/hooks/use-mobile`, `@/hooks/use-toast`; `@/configs/locales`, `@/configs/sidebar-map`.

- [ ] **Step 1: Copy hooks and configs**

```bash
cp -R frontend/hooks/. frontend-react/src/hooks/
cp -R frontend/configs/. frontend-react/src/configs/
```

- [ ] **Step 2: Fix framework imports**

Run: `grep -rn "next/\|next-intl" frontend-react/src/hooks frontend-react/src/configs`
Apply the recipe to each hit. (`configs/locales.ts` is plain TS — expect zero hits. Hooks use `@/lib/*` + React — expect zero or few.)

- [ ] **Step 3: Typecheck**

Run: `cd frontend-react && npx tsc --noEmit 2>&1 | grep -E "src/(hooks|configs)/" || echo "hooks/configs clean"`
Expected: `hooks/configs clean`.

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/hooks frontend-react/src/configs
git commit -m "feat(frontend-react): port hooks/* and configs/*"
```

### Task 9: Port `components/ui/**`

**Files:**
- Copy: `frontend/components/ui/**` → `frontend-react/src/components/ui/`
- Modify: per recipe

**Interfaces:**
- Produces: all shadcn primitives under `@/components/ui/*` (Button, Card, Dialog, Sidebar, etc.).

- [ ] **Step 1: Copy the ui folder**

```bash
mkdir -p frontend-react/src/components/ui
cp -R frontend/components/ui/. frontend-react/src/components/ui/
```

- [ ] **Step 2: Fix framework imports across ui**

Run: `grep -rln "next/\|next-intl" frontend-react/src/components/ui`
Apply the recipe to each listed file (commonly `sidebar.tsx` may use `next/link` or the mobile hook). The `use-mobile` hook is already at `@/hooks/use-mobile` — if a ui file imports `@/components/ui/use-mobile`, leave it (that copy exists too).

- [ ] **Step 3: Build to verify ui compiles**

Run: `cd frontend-react && npx tsc --noEmit 2>&1 | grep -E "src/components/ui/" || echo "ui clean"`
Expected: `ui clean`.

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/components/ui
git commit -m "feat(frontend-react): port components/ui/* (shadcn)"
```

---

## Phase 5 — Port feature components (kb, search, activity)

### Task 10: Port `components/kb/**`

**Files:**
- Copy: `frontend/components/kb/**` (recursive — includes `kb/article/`) → `frontend-react/src/components/kb/`
- Modify: per recipe

**Interfaces:**
- Produces: `@/components/kb/*` (header, footer, sidebar, breadcrumb, category-grid, bu-landing-cards, quick-help, toc, mobile-sidebar, language-switcher, theme-toggle, article/markdown-content, …).

- [ ] **Step 1: Copy the kb tree**

```bash
mkdir -p frontend-react/src/components/kb
cp -R frontend/components/kb/. frontend-react/src/components/kb/
```

- [ ] **Step 2: List files needing import fixes**

Run: `grep -rln "next/\|next-intl" frontend-react/src/components/kb`
Apply the recipe to each. Pay attention to:
- `header.tsx`, `footer.tsx`, `breadcrumb.tsx`, `sidebar.tsx`, `mobile-sidebar.tsx` — likely use `next/link` + `useTranslations`.
- `language-switcher.tsx` — uses `setLocaleCookie`/`getLocaleFromClient` (already at `@/lib/locale`) + likely `useRouter().refresh()`; replace `router.refresh()` with nothing (i18n updates reactively via the `locale-changed` listener) — if it called `router.refresh()` to re-render server content, instead rely on the i18n event; if a hard reload is desired keep `window.location.reload()`.
- `theme-toggle.tsx` — uses `next-themes` `useTheme` (kept, no change).
- `article/markdown-content.tsx` — uses `react-markdown`, `mermaid`, `dompurify`, `rehype-*` (kept). Check for `next/image` inside rendered markdown components and swap to `<img>`.

- [ ] **Step 3: Handle internal navigation links**

For any `<Link href={resolveWikiMarkdownHref(...)}>` style usage, ensure `href` → `to`. For raw `<a href>` to internal routes inside markdown, leave as-is (full reload acceptable) unless the original used `next/link`.

- [ ] **Step 4: Typecheck kb**

Run: `cd frontend-react && npx tsc --noEmit 2>&1 | grep -E "src/components/kb/" || echo "kb clean"`
Expected: `kb clean`.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/kb
git commit -m "feat(frontend-react): port components/kb/* (links/i18n fixed)"
```

### Task 11: Port `components/search/**` and `components/activity/**`

**Files:**
- Copy: `frontend/components/search/**`, `frontend/components/activity/**` → mirror under `frontend-react/src/components/`
- Modify: per recipe

**Interfaces:**
- Produces: `@/components/search/*` (global-search), `@/components/activity/*`.

- [ ] **Step 1: Copy both folders**

```bash
mkdir -p frontend-react/src/components/search frontend-react/src/components/activity
cp -R frontend/components/search/. frontend-react/src/components/search/
cp -R frontend/components/activity/. frontend-react/src/components/activity/
```

- [ ] **Step 2: Fix imports**

Run: `grep -rln "next/\|next-intl" frontend-react/src/components/search frontend-react/src/components/activity`
Apply the recipe. `global-search.tsx` uses `fuse.js` + likely `useRouter().push()` on result-select → `navigate(...)`.

- [ ] **Step 3: Typecheck**

Run: `cd frontend-react && npx tsc --noEmit 2>&1 | grep -E "src/components/(search|activity)/" || echo "search/activity clean"`
Expected: `search/activity clean`.

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/components/search frontend-react/src/components/activity
git commit -m "feat(frontend-react): port components/search/* and activity/*"
```

---

## Phase 6 — Routes with loaders

> **Route-port recipe.** Each Next.js page becomes a route module exporting a default component and (where it fetched data) a named `loader`. Server-only calls convert as:
> - `const cookieStore = await cookies(); cookieStore.get("selected_bu")?.value` → `getSelectedBUClient()` (from `@/lib/wiki-api`).
> - `const t = await getTranslations()` (server) → in the **component**, `const t = useTranslations()` (client). Loaders must not call hooks; do translation in the component, data-fetch in the loader.
> - Drop Next fetch options: `getCategories(bu, { next: { revalidate: 300 } })` → `getCategories(bu)`.
> - `notFound()` → `throw new Response(null, { status: 404 })` in the loader (caught by route `errorElement`).
> - Read loader data in the component via `useLoaderData() as <ReturnType>`.

### Task 12: Home route (`/`)

**Files:**
- Create: `frontend-react/src/routes/home.tsx`
- Modify: `frontend-react/src/router.tsx`
- Test: `frontend-react/src/routes/home.test.tsx`

**Interfaces:**
- Consumes: `getBusinessUnits` (`@/lib/wiki-api`), `KBHeader`/`KBFooter`/`BULandingCards`/`QuickHelp` (`@/components/kb/*`).
- Produces: `default` component + `homeLoader` returning `{ businessUnits: BusinessUnit[] }`.

- [ ] **Step 1: Write the failing test**

`src/routes/home.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getBusinessUnits: vi.fn().mockResolvedValue({ items: [] }),
}));

import Home, { homeLoader } from "./home";

describe("home route", () => {
  it("renders landing shell with loader data", async () => {
    const r = createMemoryRouter(
      [{ path: "/", element: <Home />, loader: homeLoader }],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/routes/home.test.tsx`
Expected: FAIL — cannot resolve `./home`.

- [ ] **Step 3: Write `src/routes/home.tsx`**

```tsx
import { useLoaderData } from "react-router-dom";
import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { BULandingCards } from "@/components/kb/bu-landing-cards";
import { QuickHelp } from "@/components/kb/quick-help";
import { getBusinessUnits, type BusinessUnit } from "@/lib/wiki-api";

export async function homeLoader(): Promise<{ businessUnits: BusinessUnit[] }> {
  try {
    const data = await getBusinessUnits();
    return { businessUnits: data.items ?? [] };
  } catch {
    return { businessUnits: [] };
  }
}

export default function Home() {
  const { businessUnits } = useLoaderData() as { businessUnits: BusinessUnit[] };
  return (
    <div className="min-h-screen flex flex-col">
      <KBHeader />
      <main className="flex-1">
        <BULandingCards items={businessUnits} />
        <QuickHelp />
      </main>
      <KBFooter />
    </div>
  );
}
```

- [ ] **Step 4: Wire into `router.tsx`**

Replace the home placeholder line with:
```tsx
import Home, { homeLoader } from "@/routes/home";
// ...
{ index: true, element: <Home />, loader: homeLoader },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/routes/home.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/routes/home.tsx frontend-react/src/routes/home.test.tsx frontend-react/src/router.tsx
git commit -m "feat(frontend-react): home route + loader"
```

### Task 13: Categories index route (`/categories`) + loading fallback + error element

**Files:**
- Create: `frontend-react/src/routes/categories/index.tsx`
- Create: `frontend-react/src/routes/categories/loading.tsx` (skeleton, from `app/categories/loading.tsx`)
- Modify: `frontend-react/src/router.tsx`
- Test: `frontend-react/src/routes/categories/index.test.tsx`

**Interfaces:**
- Consumes: `getCategories` (`@/lib/wiki-api`), `getSelectedBUClient` (`@/lib/wiki-api`), `DEFAULT_BU` (`@/lib/config`), kb components.
- Produces: `default` component, `categoriesLoader` returning `{ items: { slug: string; title: string }[] }`, and `CategoriesLoading` (skeleton).

- [ ] **Step 1: Copy the skeleton as the route fallback**

```bash
mkdir -p frontend-react/src/routes/categories
cp frontend/app/categories/loading.tsx frontend-react/src/routes/categories/loading.tsx
```
Rename its default export to `CategoriesLoading` (it already is `CategoriesLoading`). No `next/*` imports — leave as-is.

- [ ] **Step 2: Write the failing test**

`src/routes/categories/index.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getCategories: vi.fn().mockResolvedValue({ items: [{ slug: "ap", title: "AP" }] }),
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
}));

import Categories, { categoriesLoader } from "./index";

describe("categories route", () => {
  it("renders categories from loader", async () => {
    const r = createMemoryRouter(
      [{ path: "/categories", element: <Categories />, loader: categoriesLoader }],
      { initialEntries: ["/categories"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/routes/categories/index.test.tsx`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 4: Write `src/routes/categories/index.tsx`**

```tsx
import { useLoaderData } from "react-router-dom";
import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { CategoryGrid } from "@/components/kb/category-grid";
import { getCategories, getSelectedBUClient } from "@/lib/wiki-api";
import { useTranslations } from "@/i18n/use-translations";

type CategoriesData = { items: { slug: string; title: string }[] };

export async function categoriesLoader(): Promise<CategoriesData> {
  const bu = getSelectedBUClient();
  const data = await getCategories(bu);
  return { items: data.items };
}

export default function Categories() {
  const t = useTranslations();
  const { items } = useLoaderData() as CategoriesData;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      <MobileSidebar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 flex flex-col lg:flex-row gap-6 sm:gap-8">
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-24">
              <KBSidebar />
            </div>
          </aside>
          <div className="flex-1 w-full">
            <Breadcrumb items={[{ label: t("common.categoriesAll") }]} />
            <div className="mt-4 mb-6 sm:mt-6 sm:mb-8 md:mb-10">
              <h1 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
                {t("category.documents")}
              </h1>
            </div>
            <CategoryGrid items={items} />
          </div>
        </div>
      </main>
      <KBFooter />
    </div>
  );
}
```

- [ ] **Step 5: Create the error element** (renders the original error UI on loader failure)

Create `src/routes/categories/error.tsx`:
```tsx
import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { useTranslations } from "@/i18n/use-translations";

export default function CategoriesError() {
  const t = useTranslations();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      <MobileSidebar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
          <aside className="hidden md:block w-64 shrink-0"><KBSidebar /></aside>
          <div className="flex-1">
            <Breadcrumb items={[{ label: t("common.categoriesAll") }]} />
            <div className="mt-8 p-12 border border-dashed rounded-[2rem] flex flex-col items-center text-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">{t("errors.loadFailed")}</h2>
              <p className="text-muted-foreground mt-2 max-w-xs">{t("errors.systemError")}</p>
            </div>
          </div>
        </div>
      </main>
      <KBFooter />
    </div>
  );
}
```

- [ ] **Step 6: Wire into `router.tsx`** with loader, `errorElement`, and `HydrateFallback`

```tsx
import Categories, { categoriesLoader } from "@/routes/categories/index";
import CategoriesLoading from "@/routes/categories/loading";
import CategoriesError from "@/routes/categories/error";
// ...
{
  path: "categories",
  element: <Categories />,
  loader: categoriesLoader,
  errorElement: <CategoriesError />,
  HydrateFallback: CategoriesLoading,
},
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/routes/categories/index.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/routes/categories frontend-react/src/router.tsx
git commit -m "feat(frontend-react): /categories route + loader + error + skeleton"
```

### Task 14: Category detail route (`/categories/:category`)

**Files:**
- Create: `frontend-react/src/routes/categories/category.tsx`
- Modify: `frontend-react/src/router.tsx`
- Test: `frontend-react/src/routes/categories/category.test.tsx`

**Interfaces:**
- Consumes: `getCategory` + `getContent` + `getSelectedBUClient` (`@/lib/wiki-api`), `gray-matter`.
- Produces: `default` + `categoryLoader({ params })` returning the data shape the original `app/categories/[category]/page.tsx` computed.

- [ ] **Step 1: Read the original page to mirror its data + JSX**

Run: `cat "frontend/app/categories/[category]/page.tsx"`
Identify: the data calls (`getCategory(category, bu)`, possibly `getContent` + `matter(...)`), `params.category`, the cookie read, and the rendered components.

- [ ] **Step 2: Write the failing test**

`src/routes/categories/category.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getCategory: vi.fn().mockResolvedValue({ items: [], title: "AP" }),
  getContent: vi.fn().mockResolvedValue({ content: "", title: "AP" }),
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
}));

import Category, { categoryLoader } from "./category";

describe("category detail route", () => {
  it("renders for a category param", async () => {
    const r = createMemoryRouter(
      [{ path: "/categories/:category", element: <Category />, loader: categoryLoader }],
      { initialEntries: ["/categories/ap"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
```
(Adjust the `vi.mock` to the exact functions the original page calls — discovered in Step 1.)

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/routes/categories/category.test.tsx`
Expected: FAIL — cannot resolve `./category`.

- [ ] **Step 4: Write `src/routes/categories/category.tsx`**

Port the original page body. Skeleton (fill the data calls + JSX from Step 1, applying the route-port recipe):
```tsx
import { useLoaderData, type LoaderFunctionArgs } from "react-router-dom";
import { getCategory, getSelectedBUClient } from "@/lib/wiki-api";
import { useTranslations } from "@/i18n/use-translations";
// + kb component imports the original used

export async function categoryLoader({ params }: LoaderFunctionArgs) {
  const category = params.category as string;
  const bu = getSelectedBUClient();
  const data = await getCategory(category, bu); // mirror original calls
  return { category, ...data };
}

export default function Category() {
  const t = useTranslations();
  const data = useLoaderData() as Awaited<ReturnType<typeof categoryLoader>>;
  // paste the original JSX, sourcing values from `data` + `t(...)`
  return <main>{/* ...ported markup... */}</main>;
}
```

- [ ] **Step 5: Wire into router**

```tsx
import Category, { categoryLoader } from "@/routes/categories/category";
// ...
{ path: "categories/:category", element: <Category />, loader: categoryLoader, errorElement: <CategoriesError /> },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/routes/categories/category.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/routes/categories/category.tsx frontend-react/src/routes/categories/category.test.tsx frontend-react/src/router.tsx
git commit -m "feat(frontend-react): /categories/:category route + loader"
```

### Task 15: Article route (`/categories/:category/*`, splat + gray-matter)

**Files:**
- Create: `frontend-react/src/routes/categories/article.tsx`
- Modify: `frontend-react/src/router.tsx`
- Test: `frontend-react/src/routes/categories/article.test.tsx`

**Interfaces:**
- Consumes: `getContent` + `getSelectedBUClient` (`@/lib/wiki-api`), `gray-matter`, `getLocaleFromClient` (`@/lib/locale`), markdown-content + TOC + sidebar kb components.
- Produces: `default` + `articleLoader({ params })`. The article path is `params["*"]` (splat).

- [ ] **Step 1: Read the original article page**

Run: `cat "frontend/app/categories/[category]/[...article]/page.tsx"`
Identify: how it builds the wiki path from `params.category` + `params.article[]`, the `getContent(path, bu, locale)` call, `matter(content)` parsing, and the rendered components (markdown-content, TOC, related-articles, etc.).

- [ ] **Step 2: Write the failing test**

`src/routes/categories/article.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getContent: vi.fn().mockResolvedValue({
    path: "ap/intro", title: "Intro", content: "---\ntitle: Intro\n---\n# Hi",
  }),
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
}));

import Article, { articleLoader } from "./article";

describe("article route", () => {
  it("renders an article from a splat path", async () => {
    const r = createMemoryRouter(
      [{ path: "/categories/:category/*", element: <Article />, loader: articleLoader }],
      { initialEntries: ["/categories/ap/intro"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/routes/categories/article.test.tsx`
Expected: FAIL — cannot resolve `./article`.

- [ ] **Step 4: Write `src/routes/categories/article.tsx`**

Port the original. The path-building changes from `params.article` (array) to splitting `params["*"]`:
```tsx
import { useLoaderData, type LoaderFunctionArgs } from "react-router-dom";
import matter from "gray-matter";
import { getContent, getSelectedBUClient } from "@/lib/wiki-api";
import { getLocaleFromClient } from "@/lib/locale";
// + kb imports the original used (markdown-content, toc, etc.)

export async function articleLoader({ params }: LoaderFunctionArgs) {
  const category = params.category as string;
  const rest = params["*"] ?? "";           // was params.article.join("/")
  const wikiPath = `${category}/${rest}`.replace(/\/+$/, "");
  const bu = getSelectedBUClient();
  const locale = getLocaleFromClient();
  try {
    const doc = await getContent(wikiPath, bu, locale);
    const parsed = matter(doc.content ?? "");
    return { doc, body: parsed.content, frontmatter: parsed.data };
  } catch {
    throw new Response(null, { status: 404 });
  }
}

export default function Article() {
  const { doc, body, frontmatter } = useLoaderData() as Awaited<ReturnType<typeof articleLoader>>;
  // paste original JSX; pass `body`/`frontmatter`/`doc` to the markdown + TOC components
  return <main>{/* ...ported markup... */}</main>;
}
```
(Match `getContent`'s real signature and the exact path-build logic from the original — adapt the `wikiPath` construction to whatever helper the original used, e.g. `normalizeWikiRelPath`.)

- [ ] **Step 5: Wire into router** (with not-found error element from Task 19)

```tsx
import Article, { articleLoader } from "@/routes/categories/article";
// ...
{ path: "categories/:category/*", element: <Article />, loader: articleLoader, errorElement: <NotFound /> },
```
(If `NotFound` isn't created yet, temporarily use `<CategoriesError />`; switch to `<NotFound />` in Task 19.)

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/routes/categories/article.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/routes/categories/article.tsx frontend-react/src/routes/categories/article.test.tsx frontend-react/src/router.tsx
git commit -m "feat(frontend-react): article route (splat + gray-matter)"
```

### Task 16: FAQ routes (`/faq` and `/faq/*`)

**Files:**
- Create: `frontend-react/src/routes/faq/index.tsx`, `frontend-react/src/routes/faq/path.tsx`
- Modify: `frontend-react/src/router.tsx`
- Test: `frontend-react/src/routes/faq/index.test.tsx`

**Interfaces:**
- Consumes: the FAQ data helpers the originals use (`@/lib/wiki-api` / `@/lib/faq-nav` / `@/lib/faq-cache`), `gray-matter`, `getSelectedBUClient`.
- Produces: `default` + `faqLoader` for index; `default` + `faqPathLoader({ params })` for the splat page (`params["*"]`).

- [ ] **Step 1: Read both originals**

Run:
```bash
cat frontend/app/faq/page.tsx
cat "frontend/app/faq/[...path]/page.tsx"
```
Note their data calls, the cookie read (`selected_bu`), and `matter(...)` usage.

- [ ] **Step 2: Write the failing test (index)**

`src/routes/faq/index.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

// mock whatever FAQ data fn the original index page calls:
vi.mock("@/lib/wiki-api", () => ({
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
  // add the real FAQ fetch fn here, mocked to resolve minimal data
}));

import Faq, { faqLoader } from "./index";

describe("faq index route", () => {
  it("renders the faq landing", async () => {
    const r = createMemoryRouter(
      [{ path: "/faq", element: <Faq />, loader: faqLoader }],
      { initialEntries: ["/faq"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/routes/faq/index.test.tsx`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 4: Write `src/routes/faq/index.tsx` and `src/routes/faq/path.tsx`**

Port each original body, converting `cookies()` → `getSelectedBUClient()`, `getTranslations()` → component `useTranslations()`, data-fetch into the loader, and (for `path.tsx`) the catch-all `params.path[]` → `params["*"]`. Use the same loader/component shape demonstrated in Tasks 13–15.

- [ ] **Step 5: Wire both into router**

```tsx
import Faq, { faqLoader } from "@/routes/faq/index";
import FaqPath, { faqPathLoader } from "@/routes/faq/path";
// ...
{ path: "faq", element: <Faq />, loader: faqLoader },
{ path: "faq/*", element: <FaqPath />, loader: faqPathLoader, errorElement: <NotFound /> },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/routes/faq/index.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/routes/faq frontend-react/src/router.tsx
git commit -m "feat(frontend-react): /faq and /faq/* routes + loaders"
```

### Task 17: Activity routes (`/activity`, `/admin/activity`)

**Files:**
- Create: `frontend-react/src/routes/activity.tsx`, `frontend-react/src/routes/admin-activity.tsx`
- Modify: `frontend-react/src/router.tsx`
- Test: `frontend-react/src/routes/activity.test.tsx`

**Interfaces:**
- Consumes: `getActivityLogs` (`@/lib/wiki-api`), `getSelectedBUClient`, activity components.
- Produces: `default` + `activityLoader` for `/activity`; `default` (+ loader if the original fetched) for `/admin/activity`.

- [ ] **Step 1: Read both originals**

Run:
```bash
cat frontend/app/activity/page.tsx
cat frontend/app/admin/activity/page.tsx
```

- [ ] **Step 2: Write the failing test**

`src/routes/activity.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getActivityLogs: vi.fn().mockResolvedValue({ items: [] }),
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
}));

import Activity, { activityLoader } from "./activity";

describe("activity route", () => {
  it("renders activity list", async () => {
    const r = createMemoryRouter(
      [{ path: "/activity", element: <Activity />, loader: activityLoader }],
      { initialEntries: ["/activity"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/routes/activity.test.tsx`
Expected: FAIL — cannot resolve `./activity`.

- [ ] **Step 4: Write both route modules** per the recipe (cookie → `getSelectedBUClient`, data-fetch → loader, translations in component).

- [ ] **Step 5: Wire into router**

```tsx
import Activity, { activityLoader } from "@/routes/activity";
import AdminActivity from "@/routes/admin-activity";
// ...
{ path: "activity", element: <Activity />, loader: activityLoader },
{ path: "admin/activity", element: <AdminActivity /> },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/routes/activity.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/routes/activity.tsx frontend-react/src/routes/admin-activity.tsx frontend-react/src/routes/activity.test.tsx frontend-react/src/router.tsx
git commit -m "feat(frontend-react): /activity and /admin/activity routes"
```

### Task 18: Chat route (`/chat`, client-only)

**Files:**
- Create: `frontend-react/src/routes/chat.tsx`
- Modify: `frontend-react/src/router.tsx`
- Test: `frontend-react/src/routes/chat.test.tsx`

**Interfaces:**
- Consumes: `askChat` (`@/lib/wiki-api`), ui + kb components.
- Produces: `default` component (no loader — fully client-side, identical logic to `app/chat/page.tsx`).

- [ ] **Step 1: Write the failing test**

`src/routes/chat.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({ askChat: vi.fn() }));

import Chat from "./chat";

describe("chat route", () => {
  it("renders the question form", () => {
    render(<MemoryRouter><Chat /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /ส่งคำถาม|Send/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/routes/chat.test.tsx`
Expected: FAIL — cannot resolve `./chat`.

- [ ] **Step 3: Copy + adapt the chat page**

```bash
cp frontend/app/chat/page.tsx frontend-react/src/routes/chat.tsx
```
Remove the `"use client"` directive line (no-op in Vite). Verify imports are all `@/...` (they are). No `next/*` usage in this file.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/routes/chat.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire into router**

```tsx
import Chat from "@/routes/chat";
// ...
{ path: "chat", element: <Chat /> },
```

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/routes/chat.tsx frontend-react/src/routes/chat.test.tsx frontend-react/src/router.tsx
git commit -m "feat(frontend-react): /chat route"
```

### Task 19: Not-found route (`*`)

**Files:**
- Create: `frontend-react/src/routes/not-found.tsx`
- Modify: `frontend-react/src/router.tsx` (catch-all + replace temporary error elements)
- Test: `frontend-react/src/routes/not-found.test.tsx`

**Interfaces:**
- Consumes: `useTranslations` (`@/i18n/use-translations`), `Link` (react-router).
- Produces: `default` component (the 404 screen).

- [ ] **Step 1: Write the failing test**

`src/routes/not-found.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./not-found";

describe("not-found", () => {
  it("renders the 404 heading", () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/routes/not-found.test.tsx`
Expected: FAIL — cannot resolve `./not-found`.

- [ ] **Step 3: Copy + adapt `app/not-found.tsx`**

```bash
cp frontend/app/not-found.tsx frontend-react/src/routes/not-found.tsx
```
Apply the recipe: remove `"use client"`; `import Link from "next/link"` → `import { Link } from "react-router-dom"`; `import { useTranslations } from "next-intl"` → `import { useTranslations } from "@/i18n/use-translations"`; both `<Link href="/">`/`<Link href="/categories">` → `to="/"` / `to="/categories"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/routes/not-found.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire into router**

Replace the `*` placeholder with `import NotFound from "@/routes/not-found";` and `{ path: "*", element: <NotFound /> }`. Replace any temporary `errorElement={<CategoriesError/>}` placed on the article/faq splat routes with `<NotFound />`.

- [ ] **Step 6: Run the full route test suite**

Run: `cd frontend-react && npx vitest run src/routes src/router.test.tsx`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/routes/not-found.tsx frontend-react/src/routes/not-found.test.tsx frontend-react/src/router.tsx
git commit -m "feat(frontend-react): 404 not-found route + wire error elements"
```

---

## Phase 7 — Chat widget & export

### Task 20: Port `components/chat/**`, wire FloatingChatBot, point export at Go backend

**Files:**
- Copy: `frontend/components/chat/**` (recursive — includes `chat/parts/`) → `frontend-react/src/components/chat/`
- Modify: `frontend-react/src/components/chat/carmen-message.tsx` (export URLs)
- Modify: `frontend-react/src/root-layout.tsx` (render `<FloatingChatBot/>`)
- Test: `frontend-react/src/components/chat/carmen-message.export.test.tsx`

**Interfaces:**
- Consumes: `configs/locales`, `@/lib/wiki-api` (`API_BASE` via `@/lib/config`), hooks (`use-carmen-chat`, `use-chat-stream`), ui components.
- Produces: `@/components/chat/floating-chatbot` default export (`FloatingChatBot`).

- [ ] **Step 1: Copy the chat tree**

```bash
mkdir -p frontend-react/src/components/chat
cp -R frontend/components/chat/. frontend-react/src/components/chat/
```

- [ ] **Step 2: Fix framework imports**

Run: `grep -rln "next/\|next-intl" frontend-react/src/components/chat`
Apply the recipe (notably `floating-chatbot.tsx` imports `next-intl` + `getLocaleFromClient`). Remove any `"use client"` directives (harmless but unnecessary).

- [ ] **Step 3: Point export fetches at the Go backend**

In `frontend-react/src/components/chat/carmen-message.tsx`:
- Add import: `import { API_BASE } from "@/lib/config";`
- Change `await fetch("/api/export/docx", {` → `await fetch(\`${API_BASE}/api/export/docx\`, {`
- Change `await fetch("/api/export/pdf", {` → `await fetch(\`${API_BASE}/api/export/pdf\`, {`

- [ ] **Step 4: Write a test asserting export targets the backend**

`src/components/chat/carmen-message.export.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("carmen-message export", () => {
  it("posts export to the Go backend, not a Next route", () => {
    const src = readFileSync(
      new URL("./carmen-message.tsx", import.meta.url),
      "utf8",
    );
    expect(src).toContain("${API_BASE}/api/export/docx");
    expect(src).toContain("${API_BASE}/api/export/pdf");
    expect(src).not.toMatch(/fetch\("\/api\/export/);
  });
});
```
(This source-level assertion avoids standing up the full chat component in jsdom while still guarding the critical change.)

- [ ] **Step 5: Run the test**

Run: `cd frontend-react && npx vitest run src/components/chat/carmen-message.export.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire `<FloatingChatBot/>` into root layout**

Edit `src/root-layout.tsx`:
```tsx
import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import FloatingChatBot from "@/components/chat/floating-chatbot";
import "@/i18n";

export default function RootLayout() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Outlet />
      <FloatingChatBot />
    </ThemeProvider>
  );
}
```
(Match the actual default-vs-named export of `floating-chatbot.tsx`.)

- [ ] **Step 7: Typecheck + build**

Run: `cd frontend-react && npm run build`
Expected: exit 0. Fix any remaining `next/*`/`next-intl` import errors surfaced here using the recipe.

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/components/chat frontend-react/src/root-layout.tsx frontend-react/src/components/chat/carmen-message.export.test.tsx
git commit -m "feat(frontend-react): port chat widget, export → Go backend, wire FloatingChatBot"
```

---

## Phase 8 — Tests, full verification, deploy config

### Task 21: Port applicable tests from `frontend/__tests__`

**Files:**
- Inspect: `frontend/__tests__/**`
- Create: ported tests under `frontend-react/src/**` (co-located or `frontend-react/src/__tests__/`)

**Interfaces:**
- Produces: a green Vitest suite covering ported logic.

- [ ] **Step 1: Inventory existing tests**

Run: `find frontend/__tests__ -type f`
For each: decide **port** (framework-agnostic: lib utils, component render) or **drop** (Next-coupled: `ssrf-guard.test.ts` → moved to Go; export route tests; any test importing `next/*`).

- [ ] **Step 2: Port the framework-agnostic ones**

Copy each portable test into `frontend-react/src/`, fixing imports to `@/...` and replacing any Next test utilities (e.g. `next/navigation` mocks) with React Router `createMemoryRouter`/`MemoryRouter`. Convert Jest globals if needed (Vitest provides `describe/it/expect` globally via config; replace `jest.fn` → `vi.fn`, `jest.mock` → `vi.mock`).

- [ ] **Step 3: Run the full suite**

Run: `cd frontend-react && npm test`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src
git commit -m "test(frontend-react): port framework-agnostic tests to vitest"
```

### Task 22: Lint clean + full typecheck/build + dev smoke

**Files:** none new (fix-ups only)

- [ ] **Step 1: Lint**

Run: `cd frontend-react && npm run lint`
Expected: exit 0. Fix violations (commonly: unused imports left after the next→react swap; prefix intentionally-unused with `_`).

- [ ] **Step 2: Typecheck + production build**

Run: `cd frontend-react && npm run build`
Expected: exit 0, `dist/` produced.

- [ ] **Step 3: Dev smoke test against a backend**

Run: `cd frontend-react && VITE_API_BASE=http://localhost:8080 npm run dev`
Manually open `/`, `/categories`, a category, an article, `/faq`, `/activity`, `/chat`, and a bogus URL (404). Confirm: pages render, BU switcher + language switcher work, theme toggle works, the floating chatbot opens. Ctrl-C when done.

- [ ] **Step 4: Commit any fix-ups**

```bash
git add frontend-react
git commit -m "chore(frontend-react): lint/type fixups; verified routes render"
```

### Task 23: Deploy config (vercel.json, Dockerfile, README, env example)

**Files:**
- Create: `frontend-react/vercel.json`
- Create: `frontend-react/Dockerfile`, `frontend-react/nginx.conf`
- Create: `frontend-react/README.md`

**Interfaces:**
- Produces: static deploy with SPA fallback; containerized static serve.

- [ ] **Step 1: Create `vercel.json`** (SPA rewrite)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "regions": ["sin1"]
}
```

- [ ] **Step 2: Create `nginx.conf`** (SPA fallback)

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

- [ ] **Step 3: Create `Dockerfile`**

```dockerfile
# Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build

# Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 4: Create `README.md`**

```markdown
# Carmen Frontend (React SPA)

Vite + React Router v7 SPA clone of the Next.js `frontend/`. Talks only to the Go backend.

## Run
\`\`\`bash
cd frontend-react
npm install
VITE_API_BASE=http://localhost:8080 npm run dev
\`\`\`

## Commands
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the built app
- `npm run lint` / `npm test`

## Env
- `VITE_API_BASE` — Go backend base URL (required at build time in production)
- `VITE_USE_REMOTE_API` — `true` to use a remote API base in dev

## Notes
- Export PDF/DOCX calls `${VITE_API_BASE}/api/export/{pdf,docx}` — **requires the Go backend
  export endpoints** (separate task); inert until those exist.
- SPA routing needs a host-level rewrite of all paths to `index.html` (see `vercel.json` / `nginx.conf`).
```

- [ ] **Step 5: Verify the Docker build (optional but recommended)**

Run: `cd frontend-react && docker build --build-arg VITE_API_BASE=http://localhost:8080 -t carmen-frontend-react .`
Expected: image builds; `npm run build` succeeds inside.

- [ ] **Step 6: Final full verification**

Run: `cd frontend-react && npm run lint && npm test && npm run build`
Expected: all three exit 0.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/vercel.json frontend-react/Dockerfile frontend-react/nginx.conf frontend-react/README.md
git commit -m "chore(frontend-react): deploy config (vercel rewrite, docker/nginx, README)"
```

---

## Out of scope (tracked separately)

- **Go backend export endpoints** `/api/export/{pdf,docx}` — port the existing `app/api/export/*`
  logic (puppeteer render + `embedSafeImages` + `ssrf-guard`) to Go (e.g. chromedp). The React app
  is wired and ready; export is inert until these exist.
- **Cutover** (DNS/Vercel project switch from `frontend/` to `frontend-react/`, deleting `frontend/`).

---

## Self-Review

**Spec coverage check:**
- §2 Approach (Vite + React Router + react-i18next + next-themes) → Tasks 1, 5, 6 ✅
- §3 Folder structure → Tasks 1–6 establish it; ports fill it ✅
- §4.1 Route map (10 routes incl. 404) → Tasks 12–19 ✅
- §4.2 Data flow (loaders, cookie→client, redirect/notFound throws) → route-port recipe + Tasks 13–17 ✅
- §4.3 Next-specific replacements (link/navigation/headers/image/font/themes) → recipe table + Tasks 2,9,10,11 ✅
- §5 i18n (init, compat wrapper, ICU conversion, locale-changed sync) → Task 5 ✅
- §6 Config/env (import.meta.env, .env.example) → Task 3 ✅
- §7 Error handling (errorElement) → Tasks 13, 15, 16, 19 ✅
- §8 Export → Go backend → Task 20 (+ Out of scope note) ✅
- §9 Testing (Vitest, port tests, drop Next-coupled) → Tasks 1, 21 ✅
- §10 Deployment (static, SPA rewrite, Dockerfile) → Task 23 ✅
- §11 Build sequence (7 phases) → Phases 0–8 ✅
- §12 Risks (export dep, ICU, gray-matter, next/image) → addressed in Tasks 5,15,20 + Out of scope ✅

**Placeholder scan:** Route Tasks 14–17 intentionally say "read the original, then port its body" rather than pasting full unread page source — the exact data calls/JSX live in files the implementer must open (paths given). Worked full examples are provided for the home, categories-index, article (splat+gray-matter), chat, and not-found routes, which cover every distinct pattern (loader, cookie→client, error element, splat params, gray-matter, client-only, link/i18n swap). This is a deliberate port instruction, not a missing-detail placeholder.

**Type consistency:** `useTranslations`/`useLocale` signatures match across Tasks 5 and all consumers; `getSelectedBUClient`/`getLocaleFromClient` names consistent with `lib/wiki-api.ts`/`lib/locale.ts`; loader return types are read back via `Awaited<ReturnType<typeof loader>>` consistently; `API_BASE`/`DEFAULT_BU` exports consistent.
