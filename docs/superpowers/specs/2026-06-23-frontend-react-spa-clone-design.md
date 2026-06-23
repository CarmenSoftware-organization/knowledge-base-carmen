# Frontend React SPA Clone — Design Spec

- **Date:** 2026-06-23
- **Status:** Approved (design)
- **Target folder:** `frontend-react/`
- **Replaces:** `frontend/` (Next.js App Router) in production, eventually

## 1. Goal & Context

Build a React.js clone of the existing Next.js frontend in a new folder `frontend-react/`,
intended to **replace `frontend/` in production**. The knowledge base is an **internal
tool — SEO/search-engine indexing is not required**, so server-side rendering can be
dropped in favour of a pure client-side SPA.

### Why this is feasible
The current frontend already fetches **all** data from the Go backend via `/api/*`
(`lib/wiki-api.ts` + `API_BASE`) — it never reads the filesystem. The bulk of the code
(`components/ui/*`, `components/kb/*`, `components/chat/*`, `components/activity/*`,
`components/search/*`, ~13.5k lines) is framework-agnostic React and ports almost verbatim.
The real work is a thin "framework glue" layer: routing, i18n, config/env, cookies, and
the export endpoints.

### Non-goals
- No SSR / no SEO work (internal tool).
- No redesign — behavior and visuals stay faithful to the Next.js app ("clone").
- No backend changes in this project **except** the export dependency (see §8).
- `frontend/` is left intact; `frontend-react/` is a separate folder.

## 2. Chosen Approach — Faithful SPA Port

Vite + React Router (declarative/data mode) + react-i18next + plain `fetch` + `next-themes`.
Chosen over a "modernized" TanStack stack (more rewrite, diverges from original) and over
SSR React (reintroduces a server, no SEO need). Lowest risk, closest to "clone", reuses
`lib/` and `components/` nearly as-is.

### Tech stack
| Concern | Choice | Notes |
|---|---|---|
| Build | Vite 7 + TypeScript | static `dist/` output |
| Routing | React Router v7 (data router, **not** framework/SSR mode) | supports `loader`s |
| i18n | react-i18next + i18next | reuse `messages/{en,th}.json` |
| Theme | next-themes (kept) | works in plain React |
| Styling | Tailwind v4 + Radix (ported) | port `postcss.config` + `globals.css` |
| Fonts | `@fontsource/geist` + `@fontsource/geist-mono` | replaces `next/font/google` |
| Data | plain `fetch` (port `wiki-api.ts`) + React Router loaders | keep existing module caches |
| Test | Vitest + Testing Library + jsdom | replaces jest |
| Export | call `${API_BASE}/api/export/*` | Go endpoint = separate dependency (§8) |

## 3. Folder Structure

```
frontend-react/
├── index.html              # entry + favicon links + font
├── vite.config.ts          # alias @/ → src/, react + tailwind plugins
├── vitest.config.ts        # (or test block in vite.config)
├── tsconfig.json
├── package.json
├── .env.example            # VITE_API_BASE, VITE_USE_REMOTE_API
├── vercel.json             # SPA rewrite: all paths → index.html
├── Dockerfile              # vite build → static serve (nginx)
├── public/                 # copied from frontend/public (favicons, images)
└── src/
    ├── main.tsx            # ReactDOM root + Providers + RouterProvider
    ├── router.tsx          # createBrowserRouter([...routes])
    ├── root-layout.tsx     # = app/layout.tsx: Providers + <Outlet/> + FloatingChatBot
    ├── routes/             # 9 pages (see §4.1) + loaders
    ├── components/         # ported: ui/ kb/ chat/ activity/ search/ theme-provider
    ├── lib/                # ported: wiki-api, utils, faq-*, carmen-*, changelog-*, ... (minus next/headers)
    ├── hooks/              # ported: use-carmen-*, use-chat-stream, use-mobile, use-toast
    ├── i18n/               # react-i18next config + next-intl-compat wrapper
    ├── messages/           # en.json, th.json (copied)
    └── styles/globals.css
```

**Principle:** keep the rewritten "glue" (`router.tsx`, `root-layout.tsx`, `routes/`,
`i18n/`, `lib/config.ts`, `lib/locale.ts`) clearly separated from "portable UI"
(`components/`, `hooks/`, remaining `lib/`). Glue is rewritten; the rest is copy + import fixes.

## 4. Routing & Data Flow

### 4.1 Route map
| Next.js (`app/`) | React Router path | File |
|---|---|---|
| `layout.tsx` | (root element) | `root-layout.tsx` |
| `page.tsx` (BU landing) | `/` | `routes/home.tsx` |
| `categories/page.tsx` | `/categories` | `routes/categories/index.tsx` |
| `categories/[category]/page.tsx` | `/categories/:category` | `routes/categories/category.tsx` |
| `categories/[category]/[...article]/page.tsx` | `/categories/:category/*` | `routes/categories/article.tsx` |
| `faq/page.tsx` | `/faq` | `routes/faq/index.tsx` |
| `faq/[...path]/page.tsx` | `/faq/*` | `routes/faq/path.tsx` |
| `activity/page.tsx` | `/activity` | `routes/activity.tsx` |
| `admin/activity/page.tsx` | `/admin/activity` | `routes/admin-activity.tsx` |
| `chat/page.tsx` | `/chat` | `routes/chat.tsx` |
| `not-found.tsx` | `errorElement` + `*` catch-all | `routes/not-found.tsx` |
| `api/export/*` | — (removed, moved to Go) | — |

- Splat segments `[...article]` / `[...path]` → React Router `*`, read via `useParams()["*"]`.
- `loading.tsx` (categories ×2) → ported into route `HydrateFallback` / Suspense fallback (reuse existing skeleton code).

### 4.2 Data flow (server component → SPA)
Current server pages do `await fetch(backend) → parse gray-matter → render`.
- Move that logic into each route's React Router **`loader`** (async, can call `wiki-api.ts`
  + `gray-matter` directly). Component reads via `useLoaderData()`.
- Interactive sub-components (already client components) stay as normal components.
- `cookies()` (next/headers, server) → use existing `getSelectedBUClient()` /
  `getLocaleFromClient()` (read `document.cookie`) in loaders/components.
- `redirect()` / `notFound()` (next/navigation) → `throw redirect(...)` /
  `throw new Response(null, { status: 404 })` in loaders.

### 4.3 Next-specific replacements
| Next-specific | Count | Replacement |
|---|---|---|
| `next/link` | 15 | React Router `<Link to>` (was `href`) |
| `next/navigation` (`useRouter`/`usePathname`/`useSearchParams`/`useParams`/`redirect`/`notFound`) | 12 | `useNavigate`/`useLocation`/`useSearchParams`/`useParams` + throw redirect/404 |
| `next-intl` + `next-intl/server` | 19 | react-i18next (see §5) |
| `next/headers` cookies | 6 (5 pages) | `document.cookie` via existing helpers |
| `next/image` | 3 | plain `<img>` |
| `next/font/google` (Geist) | 1 (layout) | `@fontsource/geist` + `@fontsource/geist-mono` |
| `next-themes` | 5 | **kept** (works in React) |
| `next/server` | 2 | only in export routes — removed |

## 5. i18n (react-i18next)

- `src/i18n/index.ts`: `i18next.use(initReactI18next).init({ resources: { en, th },
  lng: getLocaleFromClient(), fallbackLng: 'th', interpolation: { escapeValue: false } })`.
- **Compat wrapper** `src/i18n/use-translations.ts`: export a `useTranslations(ns?)` that
  returns a `t` with next-intl-like signature, so `components/*` need minimal diffs.
  `useLocale()` → `i18n.language`.
- Server calls `getTranslations` / `getLocale` (15 sites) → converted to the client wrapper
  (they currently live in server components that become client routes/loaders).
- `setLocaleCookie` (existing) dispatches `locale-changed` → wire a listener to call
  `i18n.changeLanguage()` and update `<html lang>`.
- Convert the ~4 ICU `plural` strings in `messages/*.json` to i18next form
  (`key_one` / `key_other`); verify rendered output for both en/th.

## 6. Config & Environment

Rewrite `lib/config.ts` for Vite:
- `process.env.NEXT_PUBLIC_API_BASE` → `import.meta.env.VITE_API_BASE`
- `process.env.NEXT_PUBLIC_USE_REMOTE_API` → `import.meta.env.VITE_USE_REMOTE_API`
- `process.env.NODE_ENV === 'production'` → `import.meta.env.PROD`
- Keep existing logic (localhost fallback, prod validation throw, trailing-slash strip,
  `DEFAULT_BU = "carmen"`).
- `.env.example` documents `VITE_API_BASE`, `VITE_USE_REMOTE_API`.
- Build-time: pass `VITE_API_BASE` as Docker build arg (same pattern as today).

## 7. Error Handling

- React Router `errorElement` per route + root: catches loader errors / thrown 404 →
  renders ported `not-found.tsx` / error page.
- Chat NDJSON stream error handling stays as in `use-chat-stream.ts` (plain fetch, ports directly).

## 8. Export (dependency on Go backend)

- `components/chat/carmen-message.tsx`: change `fetch("/api/export/docx")` and
  `fetch("/api/export/pdf")` → `fetch(\`${API_BASE}/api/export/docx\`)` / `.../pdf`.
- Remove `app/api/export/*`, `lib/export-images.ts`, `lib/ssrf-guard.ts` from the React app
  (this logic moves to Go).
- **Dependency / risk:** the Go `/api/export/{pdf,docx}` endpoints do not exist yet. The
  frontend will be wired and ready, but export will not function until the backend endpoints
  are implemented (port the existing puppeteer + image-embed + SSRF-guard logic to Go, e.g.
  via chromedp or a Go HTML→PDF lib). Guard the export buttons with a clear error/TODO until then.
  **This is tracked as a separate backend task, out of scope for `frontend-react/` itself.**

## 9. Testing

- Vitest + `@testing-library/react` + jsdom (config in `vitest.config.ts`).
- Port framework-agnostic tests from `__tests__/`; drop/relocate Next-coupled tests
  (`ssrf-guard.test.ts` → Go; route/export tests removed).
- Mock `wiki-api` with `vi.mock`; use `createMemoryRouter` for component tests needing routing.
- **Acceptance:** `npm run build` (vite) passes, `npm test` (vitest) green, `npm run lint`
  0 errors (port eslint flat config), `npm run dev` serves all routes, visual/behavior parity
  with the Next.js app on a manual smoke test.

## 10. Deployment

- Output: static `dist/` → deployable to Vercel / Netlify / Go static serve.
- **SPA rewrite required**: all paths → `index.html` (`vercel.json` rewrites, or Go
  `index.html` fallback).
- New `Dockerfile`: build stage (`vite build`) → serve static via nginx (lighter than Next standalone).

## 11. Build Sequence (→ becomes plan phases)

1. **Scaffold** — Vite + TS + Tailwind + `@/` alias + eslint; copy `public/`; empty providers;
   `npm run dev` renders a blank shell.
2. **Glue layer** — `lib/config.ts` (env), `i18n/` setup + compat wrapper, `lib/locale.ts`,
   `root-layout.tsx`, theme provider.
3. **Port portable code** — `components/ui/*` → `lib/*` (utils, wiki-api, faq-*, carmen-*,
   changelog-*) → `hooks/*`; fix only `next/*` imports.
4. **Routes** — one page at a time per §4.1 + loaders
   (home → categories → article → faq → activity → admin-activity → chat → 404).
5. **Chat + export** — port `components/chat/*`; point export at `${API_BASE}`.
6. **Test + lint + build** — port tests; Vitest / eslint / vite build green.
7. **Deploy config** — `vercel.json` rewrite + `Dockerfile`.

## 12. Risks & Watch-outs

- **Export depends on Go endpoints** (not yet built) — frontend ready, feature inert until then (§8).
- **i18n ICU plurals** (~4) need manual conversion + output verification.
- **gray-matter in browser** — pure JS, works, but watch bundle size; prefer parsing inside loaders.
- **next/image → `<img>`** loses image optimization (acceptable for internal tool).
- `frontend/` remains untouched; `frontend-react/` is additive and independent.
