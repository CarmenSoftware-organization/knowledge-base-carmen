# Design: Remove the TH/EN switcher — rely on the browser's Google Translate

**Date:** 2026-07-29
**Status:** Approved (pending spec review)
**Target frontend:** `frontend-react` (Vite + React Router 7) — the active/deployed
frontend, **not** `frontend-next`.
**Backend:** unchanged.

## 1. Goal

Remove the in-app TH/EN language switcher and the entire "user-selected locale"
concept from `frontend-react`. The site becomes Thai-only; readers who want
English use their browser's built-in translation (Chrome / Edge / Safari, which
all use a Google-quality engine and are already prompted by the existing
`<html lang="th">`).

The one place where language still genuinely matters — the chatbot — stops
reading a user preference and instead **detects the language of each message the
user types**.

**In scope:**

- Delete the switcher UI, the `NEXT_LOCALE` cookie plumbing, and the English UI
  strings.
- Drop the `?locale=` query parameter from all wiki content fetches.
- Add `detectMessageLang()` and wire it into the chat stream request.
- Add targeted `translate="no"` markers and defensive markup so browser
  translation cannot crash React.

**Non-goals (YAGNI):**

- No Google Translate *widget* embedded in the page.
- No changes to the Go backend. `TranslationService`, `WikiTranslationCache`,
  the `?locale=` handling in `wiki_handler.go`, and `GOOGLE_TRANSLATE_API_KEY`
  all stay exactly as they are — they simply stop being exercised by this
  frontend.
- No hint / banner / tooltip telling users about browser translation.
- No `frontend-next` changes.

## 2. Current state (what exists today)

| Layer | Mechanism | Location |
|---|---|---|
| UI strings | i18next, two hand-maintained files (160 lines each) | `src/messages/{th,en}.json` |
| Chat strings | a second, hardcoded TH/EN object | `src/configs/locales.ts` |
| Article content | **already** machine-translated server-side via Google Cloud Translation v2 when `?locale=en`, with an in-memory cache | `backend/internal/services/translation_service.go`, `translation_cache.go`, `internal/api/wiki_handler.go:109-140` |
| Switcher | TH/EN pill buttons writing cookie `NEXT_LOCALE` | `src/components/kb/language-switcher.tsx` |

So the project already runs two parallel translation systems — machine for
content, human for UI. This design removes both from the frontend's surface.

## 3. Key decisions (from brainstorming)

| # | Decision | Rationale |
|---|---|---|
| Scope | Remove the switcher entirely; the site is Thai-only | The browser's translation covers article content better than a half-maintained EN UI, and there is no team capacity to keep `en.json` accurate. |
| Depth | Delete the switcher **and** the EN strings **and** the locale plumbing, but keep i18next + `th.json` | Removing a concept halfway is worse than either extreme: dead cookies and unreachable EN blocks read as "someone forgot", not "someone decided". Keeping i18next means re-adding a language later is one new JSON file, not a rewrite. |
| Chat language | Detect from the text the user typed, per message | Without any user-facing control, `lang` still steers intent classification, the "no information found" apology, the prompt language, and the empty/truncation notices — all of which render as `chunk` events. The main answer already matches the input language via `prompts.yaml` (*"Match the latest message language"*), so `lang` only steers ~10 short strings. |
| Discoverability | Nothing added | Chrome/Edge/Safari raise the translate prompt automatically from `<html lang="th">`. Adding a banner would cost UI real estate to restate something the browser already says. |
| Backend | Untouched | Keeps this a single-deploy frontend change and leaves the door open if server-side translation is ever wanted again. |
| Changelog | Stop force-translating it | `category.tsx:52` and `article.tsx:88` currently hardcode `locale="en"` for the changelog category, but the changelog markdown **is already English** — so every request sent English text to Google to be "translated" `th→en`, burning quota for a near no-op. Dropping the `locale` parameter removes this. |

## 4. Architecture

```
BEFORE
  cookie NEXT_LOCALE ──┬─→ i18next resources {th, en}         (UI strings)
                       ├─→ getContent(?locale=) ──→ Go ──→ Google Translate API
                       └─→ chat `lang` ──→ Go (status text, no-info message)

AFTER
  (no language state anywhere)
  UI strings ......... th.json only, always Thai
  Article content .... served raw; the browser translates the rendered DOM if
                       the reader asks for it
  Chat `lang` ........ detectMessageLang(msgText)   ← the only remaining seam
```

The conceptual win: the codebase no longer models *"the language the user
chose"* (a preference nobody can set anymore). It models *"the language of this
message"*, which is a fact derivable from data already in hand.

## 5. New module — `src/lib/detect-message-lang.ts`

```ts
export type MessageLang = "th" | "en";

/** Detect the language of a chat message. Pure; no I/O, no state. */
export function detectMessageLang(text: string): MessageLang;
```

**Rules:**

| Input | Output |
|---|---|
| Contains at least one Thai character (`U+0E00`–`U+0E7F`) | `"th"` |
| No Thai characters | `"en"` |
| Empty string, whitespace, digits only, emoji only | `"th"` (this KB is Thai-first) |

**Open implementation choice — mixed-language input.** For a string such as
`"how to fix ใบกำกับภาษี"`, a presence rule returns `"th"` while a ratio rule
(e.g. Thai characters > 20% of non-whitespace) returns `"en"`. The presence rule
is the safer default for a Thai-first KB, but the ratio rule better serves an
English speaker pasting a Thai field name. **The implementer picks one, and the
test asserts that choice**; absent a strong preference, use the presence rule
(it matches the table above).

Consumer: `src/hooks/use-chat-stream.ts` computes `lang` from `msgText` at
request-build time (line 128 today reads `lang: locale`). `locale` is removed
from the hook's `deps` object entirely.

## 6. File-by-file change map

### Delete (4 files)

| File | Reason |
|---|---|
| `src/components/kb/language-switcher.tsx` | the switcher itself |
| `src/lib/locale.ts` | cookie getter/setter + `locale-changed` event, no callers left |
| `src/lib/locale.test.ts` | tests the file above |
| `src/messages/en.json` | English UI strings |

### Modify (13 files, plus one test file — see §8)

| File | Change |
|---|---|
| `src/components/kb/header.tsx` | Remove the import and all three `<LanguageSwitcher />` usages (lines 254 desktop, 271 tablet, 383 mobile menu) plus the now-empty wrapper `div`s (`.hidden.min-[360px]:block` and `.min-[360px]:hidden`). |
| `src/i18n/index.ts` | `lng: "th"` constant; drop `resources.en` and the `getLocaleFromClient` import; delete the `locale-changed` window listener. |
| `src/i18n/use-translations.ts` | Remove the `useLocale()` export. |
| `src/lib/wiki-api.ts` | Drop the `locale` parameter from `getContent()`; stop setting `params.set("locale", …)`; update the doc comment at line 366. |
| `src/routes/faq/index.tsx` | Remove the `getLocaleFromClient` import, the `locale` const, and the argument at the `getContent` call. |
| `src/routes/faq/path.tsx` | Same. |
| `src/routes/categories/category.tsx` | Same, **and** delete the force-EN line 52 (`const locale = isChangelog ? "en" : cookieLocale`). |
| `src/routes/categories/article.tsx` | Same, **and** delete force-EN line 88; `dateLocale` (line 150) becomes the constant `"th-TH"`; drop `locale` from the loader's return shape (line 56/173). |
| `src/configs/locales.ts` | Delete the whole `en` block; `LocaleKey` narrows to `"th"`. |
| `src/hooks/use-carmen-chat.ts` | Drop `config.locale` (line 36) and the `locale` const (line 135); `suggestions` (171) and `translator` (176) read `locales.th` directly. |
| `src/hooks/use-chat-stream.ts` | `lang: detectMessageLang(msgText)`; remove `locale` from the deps type and destructuring (lines 52, 74). |
| `src/components/chat/floating-chatbot.tsx` | Remove `useLocale()` (line 27), the `LocaleKey` import, and the `locale` config property. |
| `src/components/kb/toc.tsx` | Remove `useLocale()` (line 19) and `locale` from the two `useEffect` dependency arrays (lines 54, 102). |

### Add (2 files)

- `src/lib/detect-message-lang.ts`
- `src/lib/detect-message-lang.test.ts`

## 7. Coexisting with browser translation

React and browser translation are a known hazard: the browser replaces text
nodes in place, and React later throws
`NotFoundError: Failed to execute 'removeChild' on 'Node'` when it tries to
remove a node that is no longer where it left it — blanking the page
(facebook/react#11538). Three measures, highest value first:

1. **`translate="no"` on the chat window root.** Streaming text mutating while
   the translator rewrites it is the highest-risk surface in the app. This is
   a real trade-off, not a free win: the LLM answer itself is unaffected
   (users who want English type English and get a natively English answer),
   but `translate="no"` sits on the widget's outer anchor, so it also covers
   the header, input placeholder, welcome copy, suggestion chips, and modals —
   all Thai-only chrome that browser translation could have covered before
   this change, and now cannot. Accepted as the cost of the crash fix.
2. **`translate="no"` on code blocks and inline code in rendered articles.**
   Prevents field names, file paths, SQL and in-product menu labels from being
   translated into something the reader cannot follow in the actual product.
3. **Wrap conditional bare text nodes in `<span>`.** Applied only where a text
   node is swapped in place — e.g. `คัดลอก` ↔ `คัดลอกแล้ว!`, the queue-count
   badge, the typing-status line. Not a project-wide sweep.

`<html lang="th">` already exists in `index.html` and stays. It is the only
signal browsers use to offer translation, and it becomes purely static once the
`locale-changed` listener is deleted.

## 8. Testing and verification

**Existing tests affected — two, both mechanical:**

| File | Action |
|---|---|
| `src/lib/locale.test.ts` | delete with its subject |
| `src/routes/categories/article.test.tsx:39-42` | remove the `mock.module("@/lib/locale", …)` block |

`src/i18n/use-translations.test.tsx` does not touch `useLocale` and needs no
change.

**New test — one file.** `src/lib/detect-message-lang.test.ts` covers: Thai
only, English only, mixed (asserting whichever rule the implementer chose),
empty string, whitespace, digits only, emoji only. This is the single exception
to the project's skip-tests-during-plan-execution rule, agreed during
brainstorming: the function is pure, the test is cheap, and it is the only piece
of new logic in the change.

**Static checks:** `bun run build` (i.e. `tsc -b && vite build`) then
`bun run lint`. Type checking catches most regressions on its own — removing a
parameter from `getContent()` and deleting the `useLocale` export make every
missed call site a compile error.

**Manual verification (6 checks):**

1. Header at all three breakpoints (≥`xl`, `360px`–`xl`, `<360px`): no switcher,
   no leftover gap.
2. A normal article and an FAQ page load; the network tab shows **no**
   `?locale=` on `/api/wiki/content/*`.
3. Changelog still renders in English (straight from source, no API call to
   Google).
4. Chat: a Thai message yields Thai status text; an English message yields
   English status text.
5. In Chrome, right-click → translate to English: the page translates, code
   blocks do not, the chat window does not.
6. With translation active, send another chat message — no white screen.

## 9. Commit sequence

Branch: `feature/remove-language-switcher`. Every commit builds.

1. **Add** `detect-message-lang.ts` + test, switch `use-chat-stream.ts` to it.
   (Chat stops depending on `useLocale` first, so the next commit can delete
   cleanly.)
2. **Remove** the switcher, `lib/locale.ts` (+ its test), `en.json`, and reduce
   i18next to Thai.
3. **Remove** the `locale` parameter from `wiki-api.ts` and the four routes,
   including the changelog force-EN lines; fix `article.test.tsx`.
4. **Harden** against browser translation: `translate="no"` markers and `<span>`
   wrapping.

## 10. Risks and rollback

| Risk | Assessment |
|---|---|
| Firefox users cannot read English | Real and accepted. Firefox's local translation models do not cover Thai. Chrome/Edge/Safari do. Recorded here so it is a known trade-off rather than a surprise. |
| Machine translation of a whole page reads worse than the previous EN UI | The previous EN UI covered only chrome (buttons, labels); article bodies were already machine-translated. Net quality change is small. |
| A missed call site | Caught at compile time — this is why §8 leans on `tsc` rather than tests. |
| `detectMessageLang` misclassifies | Blast radius is ~10 status strings. The substantive answer is steered by the LLM prompt, not by `lang`. |
| Someone wants the switcher back | Revert the branch. `en.json` and `locale.ts` remain in git history; the backend's `?locale=` support was never removed, so restoring server-side content translation needs only the query parameter back. |

## 11. Deliberately left alone

- `backend/internal/services/translation_service.go`, `translation_cache.go`,
  and the `locale` handling in `wiki_handler.go` — still functional, simply
  unused by this frontend.
- `GOOGLE_TRANSLATE_API_KEY` in `backend/.env` — out of scope here, but note it
  currently holds a live key in a local env file; rotating or scoping it is
  worth a separate ticket now that nothing calls it.
- `frontend-next/` — not the deployed frontend; untouched.
