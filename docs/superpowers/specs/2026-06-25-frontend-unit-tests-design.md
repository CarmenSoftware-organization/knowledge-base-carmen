# Frontend Unit Tests — Regression Suite (Design)

**Date:** 2026-06-25
**Status:** Approved (design)
**Scope:** `frontend-next/` only. Backend is a separate, later spec.

## Goal

Add unit tests to `frontend-next` to **guard against regressions** — lock in the
behavior of the riskiest pure-logic helpers so that refactors and deploys can't
silently break routing, API response handling, or chatbot output formatting.

This is explicitly **not** a coverage-percentage drive and **not** a CI-gate
project. Targets are curated by regression risk, not by chasing untested files.

## Background / current state

- Test runner: **`bun test`** with `frontend-next/test-setup.ts` preloaded
  (registers happy-dom → `window`/`document`/`localStorage`/`document.cookie`
  available in tests; `@testing-library/jest-dom` matchers extended onto
  `bun:test`'s `expect`).
- Existing tests live in a flat `frontend-next/__tests__/` directory, named
  `*.test.ts`, importing source via the `@/` path alias. Today there are 5
  files, all security-focused: `ssrf-guard`, `url-safety`, `export-images`,
  `dompurify-security`, `wiki-route-security`.
- `@testing-library/react` is **not** a dependency → React component render
  testing is not set up. Pure-logic and DOM-global (cookie/localStorage)
  helpers need **no new dependencies**.
- No CI workflow runs `bun test` for the frontend today.

## Approach

Test only **pure functions and DOM-global helpers in `lib/`** that are
deterministic and need no network or React. This keeps tests stable (not flaky),
fast, and dependency-free, and fits cleanly into one spec. Follow the existing
`__tests__/` pattern exactly.

## Target modules (tiered by priority)

### Tier 1 — critical regression (must do)

| File | Functions | Why it matters |
|---|---|---|
| `lib/wiki-api.ts` | `wikiPathToRoute`, `wikiDirFromContentPath`, `resolveWikiMarkdownHref`, `normalizeWikiRelPath`, `encodeWikiPathForFetch` | Build every route/link in the app — a bug means 404s (the exact failure mode the recent frontmatter change caused). |
| `lib/fetch-utils.ts` | `apiJson` (envelope unwrap + `ApiError` + legacy flat-body fallback), `fetchWithTimeout` (abort on timeout) | Every API call flows through here; recently migrated to the response-envelope shape. |
| `lib/carmen-formatter.ts` | `formatCarmenMessage` | Transforms all chatbot output (images / links / YouTube / markdown structure / HTML escaping). Wide blast radius, many edge cases. |

### Tier 2 — high value

| File | Functions |
|---|---|
| `lib/faq-nav.ts` | `faqSegmentLabel`, `faqPathTail`, `faqIndexTitlesByFolderKey`, `buildFaqNav` |
| `lib/changelog-utils.ts` | `inferReleaseUtcFromSlug`, `changelogItemTimestamp`, `sortChangelogItems`, `buildChangelogNavList` |
| `lib/wiki-utils.ts` | `formatCategoryName`, `humanizeWikiStem`, `displayWikiArticleTitle` |

### Tier 3 — optional (DOM-global cookie/localStorage; include if time allows)

- `lib/locale.ts` — `setLocaleCookie`, `getLocaleFromClient`
- `lib/carmen-client-id.ts` — `getOrCreateClientId`
- `lib/wiki-api.ts` cookie helpers — `getSelectedBUClient`, `setSelectedBU`

### Out of scope (deferred to a later spec)

- React components (would require adding `@testing-library/react` first).
- Stateful hooks (`use-chat-stream`, `use-carmen-chat`, `use-carmen-api`,
  `use-toast`, `use-mobile`) — too complex for a regression round.
- Network-orchestration functions in `wiki-api.ts` (`getCategories`,
  `getSidebarTree`, `askChat`, `searchWiki`, `findBestArticleForQuery`, …) —
  require heavy mocking.
- `lib/config.ts` `API_BASE` — evaluated at module load from env, awkward to
  test in isolation. Noted, not tested.
- The separate **backend** unit-test spec (router / middleware / models).

## File layout & conventions

New test files (one per `lib` module) in `frontend-next/__tests__/`:

```
__tests__/
  wiki-api-paths.test.ts      ← Tier 1: 5 path/route helpers
  fetch-utils.test.ts         ← Tier 1: apiJson + fetchWithTimeout
  carmen-formatter.test.ts    ← Tier 1: formatCarmenMessage
  faq-nav.test.ts             ← Tier 2
  changelog-utils.test.ts     ← Tier 2
  wiki-utils.test.ts          ← Tier 2
  locale.test.ts              ← Tier 3 (optional)
  carmen-client-id.test.ts    ← Tier 3 (optional)
```

Conventions:
- `import { describe, it, expect } from "bun:test"`; import targets via `@/lib/...`.
- One `describe` per function; `it()` descriptions phrased as behavior sentences
  (matching `url-safety.test.ts` style).
- **`apiJson` / `fetchWithTimeout`:** mock the global `fetch` with bun's
  `mock()` / `spyOn`; restore in `afterEach` so mocks never leak across tests.
- **Cookie / localStorage (Tier 3):** use the `document` / `localStorage` that
  happy-dom already provides via the `test-setup.ts` preload — no extra setup;
  clear state in `afterEach`.
- **`formatCarmenMessage`:** assert on key HTML fragments via
  `toContain` / `toMatch` (e.g. `carmen-lightbox-img`, `embed/<id>`, escaped
  `&lt;`) rather than whole-string equality — avoids brittleness from the long
  inline-style strings.
- **Do not modify `lib/` source.** If a real bug surfaces while writing a test,
  stop and ask before changing source.

## Test cases per module

### `wiki-api-paths.test.ts`
- `wikiPathToRoute`: root `index.md` → `/`; single file → `/categories/root/<slug>`;
  `cat/index.md` → `/categories/cat`; nested `cat/sub/index.md` →
  `/categories/cat/sub`; `cat/file.md` → `/categories/cat/file`; deeper nested
  file; backslash paths; query/hash stripped; `.`/`..` segments filtered; Thai /
  spaced segments URL-encoded.
- `normalizeWikiRelPath`: NFC + per-segment `decodeURIComponent`; backslash →
  slash; a segment that fails to decode (`%E0%`) does not throw.
- `encodeWikiPathForFetch`: spaces / `"` / Thai encoded correctly; consistent
  with `normalizeWikiRelPath`.
- `wikiDirFromContentPath`: strips `/index.md`; strips trailing file; empty → `""`.
- `resolveWikiMarkdownHref`: external (`http`/`mailto`/`#`) returned unchanged;
  existing `/categories/` or `/faq` route returned unchanged; relative resolved
  against `wikiArticleDir`/`category`; absolute `/x`; no-baseDir case.

### `fetch-utils.test.ts` (mock `fetch`)
- `apiJson`: `success:true` → returns `{data, meta}`; `success:false` → throws
  `ApiError` (preserves `code` and `status`); flat body (no `success`) +
  `res.ok` → returns `data` unchanged (legacy fallback); flat body + `!res.ok` →
  throws `ApiError("HTTP_ERROR")`; invalid JSON → `body` treated as `null`.
- `fetchWithTimeout`: passes an abort `signal`; on timeout calls `abort`;
  `clearTimeout` runs in `finally` on the normal-resolve path.

### `carmen-formatter.test.ts`
- empty input → `""`; YouTube markdown link and bare URL → `<iframe …embed/<id>`;
  image `![]()` with an internal URL → `carmen-lightbox-img` and resolves through
  `apiBase/images/…`; external markdown link → `<a … carmen-link target="_blank">`;
  markdown structure (`##` → heading div, `-` → `<ul><li>`, `1.` → numbered item,
  `---` → `<hr>`); inline `**bold**` / `*italic*` / `` `code` ``; **escaping:**
  `Amount < 100` emits `&lt;` and is not treated as a tag; an already-embedded
  iframe is not double-processed.

### `faq-nav.test.ts`
- `faqSegmentLabel`: `-`/`_` → spaces; decodes Thai.
- `faqPathTail`: not starting with `faq/` → `null`; strips leading `faq`;
  backslash handled.
- `faqIndexTitlesByFolderKey`: captures the title from a folder's `index.md` at
  depth ≥ 1.
- `buildFaqNav`: splits folders vs articles by `prefix`; skips `index`; uses the
  `index.md` title for folders; sorts folders by slug and articles by path.

### `changelog-utils.test.ts`
- `inferReleaseUtcFromSlug`: `jun2026` / `june2026` / `jan_2026` → UTC day 15;
  malformed → `null`.
- `changelogItemTimestamp`: slug first, then falls back to
  `date`/`publishedAt`/`dateCreated`; none → `0`.
- `sortChangelogItems`: newest first; ties broken by slug.
- `buildChangelogNavList`: drops `index` and `/_images/`; tolerates
  `null`/`undefined` input.

### `wiki-utils.test.ts`
- `formatCategoryName`: hit in `categoryDisplayMap` → mapped value; miss →
  UPPERCASE; empty → `""`.
- `humanizeWikiStem`: strips `.md`; `-`/`_` → spaces; preserves Thai; decodes.
- `displayWikiArticleTitle`: title equal to stem → uses humanized stem; long
  (> 45 char) error-looking title → uses humanized stem; otherwise returns title.

### Tier 3 (optional)
- `locale`: set then get cookie round-trip; default when unset.
- `carmen-client-id`: creates an id on first call and persists it in
  `localStorage` on subsequent calls.

## Verification

- Run: `cd frontend-next && bun test` (the existing `test` script;
  `__tests__/` files are auto-discovered).
- Done = all new tests pass **and** the 5 existing test files stay green (no
  regression from leaked global `fetch` mocks).
- No coverage threshold is set.

## Outcome

6 test files (Tier 1 + 2) plus 2 optional (Tier 3), covering ~20 of the
highest-risk pure-logic functions — giving immediate confidence for frontend
refactors and deploys, with zero new tooling.

## Follow-ups (not this spec)

- Add a CI workflow step running `bun test` for the frontend.
- A later spec for components + hooks (after adding `@testing-library/react`).
- A separate backend unit-test spec (router / middleware / models).
