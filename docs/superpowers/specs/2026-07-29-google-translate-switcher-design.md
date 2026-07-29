# Design: In-page language switcher driven by Google Translate

**Date:** 2026-07-29
**Status:** Approved (pending spec review)
**Target frontend:** `frontend-react` (Vite + React Router 7) — the active/deployed
frontend, **not** `frontend-next`.
**Backend:** unchanged.
**Baseline:** `main` at `b245d39`, which merged
`feature/remove-language-switcher` (see
`2026-07-29-remove-language-switcher-design.md`).

## 1. Why this exists — the discovery that invalidated the previous design

The previous change removed the hand-maintained TH/EN switcher on the premise
that readers who want another language would use their browser's built-in
translation. Manual verification exposed two facts that break that premise:

1. **Chrome does not offer to translate a page written in a language the reader
   already reads.** This KB's audience is Thai and their browsers are set to
   Thai, so Chrome never surfaces the translate prompt for them. The previous
   spec recorded only the Firefox gap; the real gap is the primary audience.
2. **Server-side content translation was never switched on.**
   `TRANSLATION_ENABLED=false` in both `backend/.env` and `render.yaml`.
   Probing `?locale=en` against localhost and the Render deployment returns
   Thai, unchanged. The previous spec's §2 claim that article content was
   "already machine-translated server-side" described a code path, not
   behaviour — the flag has always been off.

Fact 2 also means the old TH/EN switcher only ever translated the UI chrome:
English buttons and labels wrapped around Thai article bodies. So the previous
removal cost users less than it appeared to, and this change is the first time
article content will actually be translated for a reader.

## 2. Goal

Put an explicit language control back in the header — our own UI, Google's
translation engine — so a reader can switch the site into any of two dozen
languages without depending on a browser prompt that never appears.

**In scope:**

- A dropdown in the header offering 24 languages (listed in §5).
- A thin module owning the `googtrans` cookie contract.
- Loading Google's Website Translator script, headless (no Google dropdown, no
  Google banner).
- Full page navigation while a translation is active, so client-side routing
  cannot serve untranslated content.
- `notranslate` boundaries: code stays verbatim, streaming chat text stays
  untouched, everything else translates.
- Graceful degradation when Google's script cannot load.

**Non-goals (YAGNI):**

- No backend change. `TRANSLATION_ENABLED` stays `false`; all translation is
  client-side.
- No return of `en.json` or any hand-maintained translation file.
- No Google-branded dropdown or banner.
- No auto-detection of the reader's preferred language — switching is explicit.
- No `frontend-next` changes.

## 3. Key decisions (from brainstorming)

| # | Decision | Rationale |
|---|---|---|
| Engine | Our own control, Google's engine underneath | The reader gets a control that matches the site's design and sits where the old one did; we get Google's coverage without maintaining translations. |
| Mechanism | Write the `googtrans` cookie, then `location.reload()` | The cookie is the narrowest and most stable surface Google's widget exposes. The alternative — driving the widget's internal `select.goog-te-combo` — depends on an undocumented class name that can break silently, and we have no automated test that would catch it. |
| Languages | 24, not all 130+ | A 130-row dropdown is a dropdown nobody can search. The list is weighted to the KB's actual audience (Thai and ASEAN hospitality/finance) with common international languages after. Adding one is a single line. |
| Language labels | Endonyms — `日本語`, not `Japanese` | Someone looking for their own language can always read its name in that language; they may not read English. |
| Chat chrome | Translates with the page | Otherwise a reader who picks Japanese gets a Japanese site with a Thai chat widget. This also resolves a trade-off the previous change accepted knowingly. |
| Chat answers | Never translated | The streaming body is the app's highest React-crash surface, and the LLM already answers in the language of the typed question, so a machine translation on top would be a second-generation copy of text that was already correct. |
| Chat `lang` | Unchanged — still `detectMessageLang(msgText)` | The page's display language and the language of a typed question are different facts. Someone reading a Japanese-translated page who types Thai wants a Thai answer. |
| SPA navigation | Full page loads while translated | See §6. |
| Backend | Untouched | Keeps this a single-deploy frontend change and leaves server-side translation available if it is ever wanted. |

## 4. Architecture

The `googtrans` cookie is the **only** language state. There is no React state,
no context, nothing to keep in sync. If a reader clears the cookie by hand, the
site correctly returns to Thai with no code involved.

```
Reader picks 日本語
  → setTranslateLang("ja")        writes cookie  googtrans=/th/ja
  → location.reload()
  → element.js boots, reads the cookie, translates the DOM
  → everything except notranslate regions (code, streaming chat text)

Reader picks ไทย
  → clearTranslateLang()          deletes the cookie
  → location.reload()             page renders as authored
```

## 5. New modules

### `src/lib/google-translate.ts`

```ts
export const TRANSLATE_SOURCE_LANG = "th";

/** Current target language, or "th" when no translation is active. */
export function getTranslateLang(): string;

/** Write the googtrans cookie for `code`. Passing "th" clears it instead. */
export function setTranslateLang(code: string): void;

/** Remove the googtrans cookie. */
export function clearTranslateLang(): void;
```

Touches `document.cookie` and nothing else — no React, no reference to Google's
script. Testable without loading anything external, and the single seam to
change if the engine is ever replaced.

**Cookie details.** Name `googtrans`, value `/th/<target>`. It must be written
at path `/` on the current host; on a production domain it must also be written
on the dot-prefixed parent (`.example.com`), because Google's widget reads
either. Clearing must remove every variant it may have written, otherwise a
stale cookie on the parent domain silently overrides the cleared one.

### `src/configs/translate-languages.ts`

```ts
export type TranslateLanguage = { code: string; label: string };
export const TRANSLATE_LANGUAGES: TranslateLanguage[];
```

Exactly these 24, in this order — `label` is the endonym, `code` is the Google
Translate language code:

| # | code | label | | # | code | label |
|---|---|---|---|---|---|---|
| 1 | `th` | ไทย | | 13 | `hi` | हिन्दी |
| 2 | `en` | English | | 14 | `de` | Deutsch |
| 3 | `zh-CN` | 简体中文 | | 15 | `fr` | Français |
| 4 | `zh-TW` | 繁體中文 | | 16 | `es` | Español |
| 5 | `ja` | 日本語 | | 17 | `it` | Italiano |
| 6 | `ko` | 한국어 | | 18 | `pt` | Português |
| 7 | `id` | Bahasa Indonesia | | 19 | `nl` | Nederlands |
| 8 | `ms` | Bahasa Melayu | | 20 | `ru` | Русский |
| 9 | `vi` | Tiếng Việt | | 21 | `ar` | العربية |
| 10 | `km` | ភាសាខ្មែរ | | 22 | `he` | עברית |
| 11 | `lo` | ລາວ | | 23 | `tr` | Türkçe |
| 12 | `my` | မြန်မာ | | 24 | `fil` | Filipino |

`th` is included as the first entry so the dropdown can show the current state
and offer the way back; selecting it clears the cookie rather than setting
`/th/th`.

### `src/components/kb/google-translate-script.tsx`

Mounted once in `root-layout.tsx`. Responsibilities, all one-time:

- inject `<script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit">`
- define `window.googleTranslateElementInit` to run
  `new google.translate.TranslateElement({ pageLanguage: "th", autoDisplay: false }, "google_translate_element")`
- render the hidden `<div id="google_translate_element" />` the widget needs
- inject the CSS that suppresses Google's banner (§8)
- run the load-failure check (§9)

Renders nothing visible.

### `src/components/kb/language-switcher.tsx`

Reclaims the filename deleted by the previous change. A dropdown built from the
existing Radix `Select` used by `BUSwitcher`, so it matches the header's
existing control. Reads `getTranslateLang()` for its current value; on change,
calls `setTranslateLang(code)` then `window.location.reload()`.

## 6. Client-side navigation while translated

Google's widget translates the document it finds at load. React Router replaces
page content without a load, so after the reader navigates, the new article
arrives in Thai while the dropdown still says English.

**Solution: while a translation is active, internal links perform a full page
load.** One capture-phase `click` listener installed in `root-layout.tsx`:

- `getTranslateLang() === "th"` → do nothing; normal SPA routing.
- otherwise → if the click resolves to a same-origin `<a href>` with no
  modifier key and no `target`, `preventDefault()` and `window.location.assign(href)`.

The reader who opted into translation gets a slower, always-correct site that
behaves like an MPA. The Thai-reading majority is unaffected — the listener
returns immediately.

This was chosen over re-triggering the widget after each route change because
that requires poking `select.goog-te-combo`, an internal Google class name with
no stability guarantee, in a codebase with no automated coverage to catch it
breaking.

## 7. What must not be translated

| Region | Translated? | Reason |
|---|---|---|
| Code blocks and inline code | **No** | `DD/MM/YY`, `VAT07`, file paths, in-product menu labels — a translated identifier cannot be followed in the actual product. |
| Streaming chat body (`StaticHtmlContent`) | **No** | Highest React-crash surface, and the LLM already answered in the reader's language. |
| Chat chrome — header, placeholder, suggestion chips, modals | Yes | Otherwise the widget is a Thai island in a translated page. |
| Article content, nav, breadcrumbs, footer | Yes | The point of the feature. |

Every excluded region carries **both** `translate="no"` and
`className="notranslate"`. Google's widget keys primarily on the class; the
attribute is the HTML5 standard that browsers' own translators honour. Carrying
both covers whichever translator is running.

## 8. Suppressing Google's banner

The widget injects a top banner iframe and sets `body { top: 40px }`, which
pushes the site header down. Suppressed with:

```css
.skiptranslate iframe,
.goog-te-banner-frame { display: none !important; }
body { top: 0 !important; }
```

Both selectors are specified because the widget has used both across versions.

## 9. When Google's script cannot load

Corporate firewalls block it, readers go offline, and Google discontinued
official support for this widget in 2019 — so treat failure as expected, not
exceptional.

After load, if `window.google?.translate` is absent, call `clearTranslateLang()`
so the dropdown shows Thai. The reader then sees a Thai page with a control
that says Thai — which is true — instead of a control claiming Japanese above
an untranslated page.

No error toast, no retry. The page is fully usable in its authored language;
saying so quietly is the whole recovery.

## 10. File-by-file change map

### Add (4 files + 1 test)

| File | Responsibility |
|---|---|
| `src/lib/google-translate.ts` | The `googtrans` cookie contract. |
| `src/lib/google-translate.test.ts` | Unit tests for the above. |
| `src/configs/translate-languages.ts` | The language list. |
| `src/components/kb/google-translate-script.tsx` | Headless script loader + banner CSS + failure check. |
| `src/components/kb/language-switcher.tsx` | The dropdown. |

### Modify (5 files)

| File | Change |
|---|---|
| `src/root-layout.tsx` | Mount `<GoogleTranslateScript />`; install the capture-phase click listener from §6. |
| `src/components/kb/header.tsx` | Add `<LanguageSwitcher />` to all three breakpoint branches — desktop utilities (before `BUSwitcher toolbar`, line 253), the tablet row (line 267), and the mobile menu footer (before `BUSwitcher fluid`, line 377). |
| `src/components/chat/carmen-message.tsx` | `StaticHtmlContent` (line 90) gets `translate="no"` and `notranslate` on its wrapper `div`. |
| `src/components/kb/article/markdown-content.tsx` | The `code` renderer (line 286) adds `notranslate` alongside its existing `translate="no"`. |
| `src/components/chat/floating-chatbot.tsx` | Remove `translate="no"` from the anchor `div` (line 110) and rewrite the comment above it (lines 101-108) — the chat chrome is now meant to translate. |

## 11. Testing and verification

**Automated — one new file.** `src/lib/google-translate.test.ts` covers reading a
missing cookie (→ `"th"`), reading `/th/ja` (→ `"ja"`), writing a code, writing
`"th"` (→ clears), clearing, and a malformed cookie value (→ `"th"`). The
project's standing rule is to skip automated tests; this is the same exception
made for `detectMessageLang` — a pure function with no external dependency,
where the test is cheap and the logic is the feature.

**Static:** `bun run build` (`tsc -b && vite build`) then `bun run lint`. Note
that `bun run lint` currently exits 1 with two pre-existing errors —
`.remember/tmp/last-ndc.ts:1:1` and `src/lib/carmen-formatter.ts:207:30` —
neither related to this work.

**Manual — 9 checks:**

1. The dropdown renders at all three header breakpoints without distorting the
   layout.
2. Pick English → the page reloads → article content is English.
3. Code blocks still read `DD/MM/YY` and `VAT07`.
4. Chat chrome is English; a streamed answer is not machine-translated.
5. Click through to another article → full page load → that article is English too.
6. No Google banner at the top; the site header has not shifted down.
7. Switch back to ไทย → everything returns to Thai, and internal links resume
   client-side routing (no full reload).
8. With a translation active, send a chat message → no white screen, no
   `NotFoundError: Failed to execute 'removeChild'` in the console.
9. Block `translate.google.com` in DevTools and reload → the dropdown shows ไทย.

Check 8 is the one the previous change could never run: Chrome would not offer
to translate a Thai page for a Thai-configured browser, so the crash path stayed
untested. With an in-page control, it is directly reachable.

## 12. Risks and accepted trade-offs

| Risk | Assessment |
|---|---|
| Google discontinued this widget for new sites in 2019 | Accepted. The script still works and is widely used, but has no guarantee. `google-translate.ts` is the single file to change if it stops, and §9 degrades the site to its authored language rather than breaking it. |
| Slower navigation while translated | Accepted, and scoped: only readers who opted into translation lose client-side routing. |
| Machine translation quality on finance/hotel terminology | Accepted. It is strictly better than the previous state, where article bodies were never translated at all. |
| Browser translators mutating React-managed DOM | Mitigated by §7's `notranslate` boundaries, and now directly testable via check 8. React 19 is also markedly more tolerant here than the React 16 era that produced facebook/react#11538. |
| A stale `googtrans` cookie on a parent domain | Addressed in §5 — clearing removes every variant that may have been written. |
| Third-party script with full DOM access | Accepted, and inherent to the approach. `element.js` runs with the page's privileges and must, since translating means reading and rewriting the DOM. **Subresource Integrity is not available here:** Google generates `element.js` per request and publishes no hash, so an `integrity` attribute would block the script outright. The exposure is therefore trust in Google plus TLS, the same trust the previous design placed in the browser's own Google-backed translator. The KB is public documentation with no authenticated session and no user data in the DOM, which keeps the blast radius small. If that ever changes — a login, per-user content — this decision should be revisited. |

## 13. Deliberately left alone

- `backend/` — `TranslationService`, `WikiTranslationCache`, the `?locale=`
  handling in `wiki_handler.go`, and `TRANSLATION_ENABLED=false`. Server-side
  translation stays off and unused.
- `GOOGLE_TRANSLATE_API_KEY` in `backend/.env` — still a live key that nothing
  calls. Rotating or scoping it remains worth a separate ticket.
- `frontend-next/` — not the deployed frontend.
- `detectMessageLang` and the chat's `lang` field — unchanged, per §3.
