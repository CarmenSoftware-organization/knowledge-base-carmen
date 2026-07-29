# Google Translate Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a 24-language dropdown in the site header that translates the page through Google's Website Translator, so readers stop depending on a browser prompt that never appears for a Thai-configured browser.

**Architecture:** The `googtrans` cookie is the only language state — no React state, nothing to keep in sync. A thin module owns the cookie contract; a headless component loads Google's `element.js` with its own dropdown and banner suppressed; the header dropdown writes the cookie and reloads. Two protections ride along: `notranslate` boundaries so code and streaming chat text stay verbatim, and a single capture-phase click listener that turns internal links into full page loads while a translation is active, because Google's widget only translates the document it finds at load time.

**Tech Stack:** React 19, TypeScript, Vite 7, React Router 7, Radix `Select` (via `src/components/ui/select.tsx`), Tailwind 4, Bun (runtime, package manager, test runner).

**Source spec:** `docs/superpowers/specs/2026-07-29-google-translate-switcher-design.md`
**Baseline:** `main` at `47fa1e1`.

## Global Constraints

- All paths are relative to `frontend-react/` unless prefixed with `docs/`.
- Package manager and test runner is **Bun**, never npm/yarn. Build: `bun run build` (= `tsc -b && vite build`). Lint: `bun run lint`. Tests: `bun test --isolate`.
- **Do not write new automated tests anywhere in this plan except `src/lib/google-translate.test.ts` and `src/lib/dom-translation-shim.test.ts`.** This is the project's standing rule (`~/.claude/CLAUDE.md` §3); both exceptions were agreed explicitly — the cookie contract because it is a pure module and is the feature, the shim because it is the safety net that keeps the whole feature from crashing the page and its behaviour is invisible until it fails. Static checks (`tsc`, `eslint`) are **not** tests and must still run.
- **Do not touch the Go backend.** `TRANSLATION_ENABLED` stays `false`; every translation in this plan happens client-side.
- **Do not touch `frontend-next/`.** It is not the deployed frontend.
- `index.html` must keep `<html lang="th">` — it is what `pageLanguage: "th"` pairs with.
- **`translate="no"` / `notranslate` may only be added at the places Task 3 and Task 6 name** — the chat's streaming body, rendered code, and the two header select controls. Marking a broader region — a route, a layout, `<body>` — would silently defeat the feature.
- **Do not add an `integrity` attribute to Google's script tag.** Google generates `element.js` per request and publishes no hash; SRI would block it outright. This is recorded as an accepted risk in spec §12.
- Branch: `feature/google-translate-switcher`, cut from `main` at `47fa1e1`. Every commit must leave `bun run build` passing.
- Commit messages: conventional commits, ending with the trailer `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

### Known pre-existing lint noise

`bun run lint` exits 1 with exactly two errors that predate this work:
- `.remember/tmp/last-ndc.ts:1:1` — `@typescript-eslint/no-unused-expressions`
- `src/lib/carmen-formatter.ts:207:30` — `no-useless-escape`

Leave both. Any lint error beyond those two belongs to this work.

### One deliberate deviation from the spec

Spec §5 lists banner-suppression CSS among the script component's responsibilities. This plan puts that CSS in `src/styles/globals.css` (Task 2) instead. It is static, applies to the whole app, and the project already keeps global overrides there (`.carmen-premium-glass`); injecting a `<style>` tag from JavaScript would be strictly more machinery for the same result. Everything else follows the spec.

---

## File Structure

**Created (6):**

| File | Responsibility |
|---|---|
| `src/lib/google-translate.ts` | The `googtrans` cookie contract. Reads/writes `document.cookie` and nothing else — no React, no reference to Google. |
| `src/lib/google-translate.test.ts` | Unit tests for the above. |
| `src/components/kb/google-translate-script.tsx` | Loads Google's `element.js` headlessly, hosts its hidden mount node, and clears a stale cookie if the script never arrives. Renders nothing visible. |
| `src/hooks/use-full-navigation-while-translated.ts` | One capture-phase click listener: while translated, internal links do a full page load. |
| `src/configs/translate-languages.ts` | The 24-entry language list. |
| `src/components/kb/language-switcher.tsx` | The header dropdown. Reclaims a filename deleted by the previous change. |

**Modified (7):** `src/root-layout.tsx`, `src/styles/globals.css`, `src/components/kb/header.tsx`, `src/messages/th.json`, `src/components/chat/carmen-message.tsx`, `src/components/kb/article/markdown-content.tsx`, `src/components/chat/floating-chatbot.tsx`.

**Task order rationale.** The switcher lands *last*. Until a `googtrans` cookie exists nothing translates, so Tasks 1-4 are inert from a reader's point of view — which means the protections (`notranslate`, full navigation) are all in place before the feature that makes translation reachable ships.

---

## Task 1: The `googtrans` cookie contract

**Files:**
- Create: `src/lib/google-translate.ts`
- Create: `src/lib/google-translate.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, from `@/lib/google-translate`:
  - `export const TRANSLATE_SOURCE_LANG = "th"`
  - `export function getTranslateLang(): string`
  - `export function setTranslateLang(code: string): void`
  - `export function clearTranslateLang(): void`

  Tasks 2, 4 and 5 all import from here.

- [ ] **Step 1: Write the failing test**

Create `src/lib/google-translate.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "bun:test";
import {
  TRANSLATE_SOURCE_LANG,
  getTranslateLang,
  setTranslateLang,
  clearTranslateLang,
} from "./google-translate";

beforeEach(() => {
  document.cookie = "googtrans=; path=/; max-age=0";
});

describe("getTranslateLang", () => {
  it("returns the source language when no cookie is set", () => {
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });

  it("reads the target out of a well-formed cookie", () => {
    document.cookie = "googtrans=/th/ja; path=/";
    expect(getTranslateLang()).toBe("ja");
  });

  it("reads a hyphenated language code", () => {
    document.cookie = "googtrans=/th/zh-CN; path=/";
    expect(getTranslateLang()).toBe("zh-CN");
  });

  it("falls back to the source language on a malformed value", () => {
    document.cookie = "googtrans=garbage; path=/";
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });

  it("falls back to the source language on an empty target", () => {
    document.cookie = "googtrans=/th/; path=/";
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });
});

describe("setTranslateLang", () => {
  it("round-trips a target language", () => {
    setTranslateLang("ja");
    expect(getTranslateLang()).toBe("ja");
  });

  it("clears rather than writing /th/th when given the source language", () => {
    setTranslateLang("ja");
    setTranslateLang(TRANSLATE_SOURCE_LANG);
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
    expect(document.cookie).not.toContain("/th/th");
  });

  it("clears when given an empty code", () => {
    setTranslateLang("ja");
    setTranslateLang("");
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });
});

describe("clearTranslateLang", () => {
  it("removes an active translation", () => {
    setTranslateLang("ja");
    clearTranslateLang();
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });

  it("is safe to call when nothing is set", () => {
    clearTranslateLang();
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });
});
```

The test environment already supports this: `src/test/setup.ts` registers happy-dom with `url: "http://localhost/"` specifically so `document.cookie` works.

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test --isolate src/lib/google-translate.test.ts
```

Expected: FAIL — `Cannot find module './google-translate'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/google-translate.ts`:

```ts
/**
 * The `googtrans` cookie is the site's entire language state.
 *
 * Google's Website Translator reads this cookie at load and translates the
 * document accordingly. Keeping it as the single source of truth means there
 * is no React state to synchronise, and a reader who clears the cookie by hand
 * correctly lands back on the authored Thai with no code involved.
 *
 * This module knows the cookie format and nothing else — no React, no
 * reference to Google's script. It is the one file to change if the engine is
 * ever replaced.
 */

/** The language the site is authored in; also the cookie's source segment. */
export const TRANSLATE_SOURCE_LANG = "th";

const COOKIE_NAME = "googtrans";

/**
 * Domain attributes to write the cookie on, `""` meaning "omit the attribute".
 *
 * Google's widget reads the cookie from the exact host or from a dot-prefixed
 * parent, so a value written on only one of them can be silently overridden by
 * a stale value on the other. Writing and clearing the same set keeps them
 * consistent. Hosts without dots (localhost) and bare IPs reject a `domain`
 * attribute outright, so they get the single unqualified write.
 */
function cookieDomains(): string[] {
  const host = window.location.hostname;
  if (!host.includes(".") || /^[\d.]+$/.test(host)) return [""];
  const registrable = host.split(".").slice(-2).join(".");
  const domains = ["", `.${host}`];
  if (`.${registrable}` !== `.${host}`) domains.push(`.${registrable}`);
  return domains;
}

/** Current target language, or `TRANSLATE_SOURCE_LANG` when none is active. */
export function getTranslateLang(): string {
  if (typeof document === "undefined") return TRANSLATE_SOURCE_LANG;

  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  if (!match) return TRANSLATE_SOURCE_LANG;

  let raw = match[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // A value we did not write; treat it as malformed below.
  }

  // The value is "/<source>/<target>". Anything else is not ours to interpret.
  const parts = raw.split("/");
  if (parts.length !== 3) return TRANSLATE_SOURCE_LANG;
  return parts[2] || TRANSLATE_SOURCE_LANG;
}

/**
 * Point the cookie at `code`. Passing the source language (or an empty string)
 * clears it instead of writing `/th/th`, which the widget treats
 * inconsistently.
 */
export function setTranslateLang(code: string): void {
  if (typeof document === "undefined") return;
  if (!code || code === TRANSLATE_SOURCE_LANG) {
    clearTranslateLang();
    return;
  }
  const value = `/${TRANSLATE_SOURCE_LANG}/${code}`;
  for (const domain of cookieDomains()) {
    document.cookie = `${COOKIE_NAME}=${value}; path=/${domain ? `; domain=${domain}` : ""}`;
  }
}

/** Remove the cookie from every domain variant it may have been written on. */
export function clearTranslateLang(): void {
  if (typeof document === "undefined") return;
  for (const domain of cookieDomains()) {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0${domain ? `; domain=${domain}` : ""}`;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test --isolate src/lib/google-translate.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Verify the build and the full suite**

```bash
bun run build && bun run lint && bun test --isolate
```

Expected: build succeeds; lint shows only the two pre-existing errors; the suite is 67 + 10 = 77 passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/google-translate.ts src/lib/google-translate.test.ts
git commit -m "$(cat <<'EOF'
feat(i18n): add the googtrans cookie contract

The cookie Google's Website Translator reads is the site's entire
language state. This module owns its format and nothing else, so the
switcher and the navigation guard can share one definition.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Load Google's translator headlessly

**Files:**
- Create: `src/components/kb/google-translate-script.tsx`
- Modify: `src/root-layout.tsx`
- Modify: `src/styles/globals.css` (append)

**Interfaces:**
- Consumes: `TRANSLATE_SOURCE_LANG`, `getTranslateLang`, `clearTranslateLang` from `@/lib/google-translate` (Task 1).
- Produces: `export function GoogleTranslateScript(): JSX.Element` from `@/components/kb/google-translate-script`. Mounted once; no props.

Nothing translates after this task — no cookie is ever written yet. That is intentional: the machinery lands before the control.

- [ ] **Step 1: Create the script component**

Create `src/components/kb/google-translate-script.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import {
  TRANSLATE_SOURCE_LANG,
  clearTranslateLang,
  getTranslateLang,
} from "@/lib/google-translate";

const SCRIPT_ID = "google-translate-script";
const MOUNT_ID = "google_translate_element";
const SCRIPT_SRC =
  "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

/** How long to wait for Google before deciding the script is not coming. */
const LOAD_GRACE_MS = 8000;

type TranslateElementOptions = { pageLanguage: string; autoDisplay: boolean };

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (
          options: TranslateElementOptions,
          containerId: string,
        ) => unknown;
      };
    };
  }
}

/**
 * Loads Google's Website Translator with its own UI suppressed: no dropdown
 * (we render our own), no banner (see globals.css). The widget still needs a
 * mount node, so this renders a hidden one.
 *
 * `autoDisplay: false` stops Google from offering its own language prompt —
 * switching is explicit, through our header control.
 */
export function GoogleTranslateScript() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;

    window.googleTranslateElementInit = () => {
      const TranslateElement = window.google?.translate?.TranslateElement;
      if (!TranslateElement) return;
      new TranslateElement(
        { pageLanguage: TRANSLATE_SOURCE_LANG, autoDisplay: false },
        MOUNT_ID,
      );
    };

    // If Google never arrives, drop any active cookie so the switcher reports
    // Thai — which is what the reader is actually looking at. Blocked by a
    // corporate firewall, offline, or Google retiring a widget it stopped
    // supporting in 2019: all the same outcome, and all expected.
    const giveUp = () => {
      if (window.google?.translate) return;
      if (getTranslateLang() !== TRANSLATE_SOURCE_LANG) clearTranslateLang();
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onerror = giveUp;
    document.body.appendChild(script);

    const timer = setTimeout(giveUp, LOAD_GRACE_MS);
    return () => clearTimeout(timer);
  }, []);

  return <div id={MOUNT_ID} className="hidden" aria-hidden />;
}
```

- [ ] **Step 2: Suppress Google's banner**

Append to `src/styles/globals.css`:

```css
/* Google Website Translator: keep the engine, drop its chrome.
   The widget injects a top banner iframe and sets `body { top: 40px }`, which
   pushes the site header down. Both selectors are listed because the widget
   has used each across versions. */
.skiptranslate iframe,
.goog-te-banner-frame {
  display: none !important;
}
body {
  top: 0 !important;
}
```

- [ ] **Step 3: Mount it once**

Replace the whole contents of `src/root-layout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import FloatingChatBot from "@/components/chat/floating-chatbot";
import { GoogleTranslateScript } from "@/components/kb/google-translate-script";
import "@/i18n";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GoogleTranslateScript />
      <Outlet />
      <FloatingChatBot />
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Verify**

```bash
bun run build && bun run lint && bun test --isolate
```

Expected: build succeeds; lint shows only the two pre-existing errors; 77 tests pass (unchanged — this task adds none).

Then start the dev server and confirm nothing changed visually yet:

```bash
bunx vite --port 3301 --strictPort
```

Open `http://localhost:3301`. The page must look exactly as before: no Google banner, no dropdown, no layout shift. In DevTools → Network, `element.js` should appear with status 200. In the Elements panel, `<div id="google_translate_element" class="hidden">` exists and is empty or holds Google's hidden markup.

Port 3301 is used rather than the `bun run dev` default of 3302 because the Go backend's `CORS_ORIGINS` allows `3301` and `3302`, and 3302 is often already taken by another dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/kb/google-translate-script.tsx src/root-layout.tsx src/styles/globals.css
git commit -m "$(cat <<'EOF'
feat(i18n): load Google's translator headlessly

Loads element.js with autoDisplay off and its banner suppressed, so the
engine is available without any Google-branded UI. Nothing translates
yet — no cookie is written until the switcher lands.

Clears a stale cookie if the script never arrives, so the site degrades
to its authored language rather than claiming a translation it cannot
perform.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `notranslate` boundaries

**Files:**
- Modify: `src/components/chat/carmen-message.tsx:90-97`
- Modify: `src/components/kb/article/markdown-content.tsx:279-287`
- Modify: `src/components/chat/floating-chatbot.tsx:101-115`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing importable. Markup only.

Two regions gain protection and one loses it. Google's widget keys primarily on the `notranslate` class; `translate="no"` is the HTML5 attribute browsers' own translators honour. Both are carried so either translator is covered.

- [ ] **Step 1: Exclude the streaming chat body**

In `src/components/chat/carmen-message.tsx`. Before:

```tsx
const StaticHtmlContent = memo(function StaticHtmlContent({ content }: { content: string }) {
  return (
    <div
      className="carmen-content break-words leading-relaxed"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});
```

After:

```tsx
// translate="no" + notranslate: this div holds the answer streaming in chunk
// by chunk, which is the app's biggest React-crash surface — a translator
// swapping text nodes while React appends to them throws NotFoundError on
// removeChild and blanks the page (facebook/react#11538). Nothing is lost:
// the LLM already answers in the language of the question, so translating it
// would be a second-generation copy of text that was already correct.
const StaticHtmlContent = memo(function StaticHtmlContent({ content }: { content: string }) {
  return (
    <div
      className="carmen-content break-words leading-relaxed notranslate"
      translate="no"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});
```

- [ ] **Step 2: Add the class to code blocks**

In `src/components/kb/article/markdown-content.tsx`, add `cn` to the existing `@/lib/utils` import. Before:

```ts
import { extractYoutubeId } from "@/lib/utils";
```

After:

```ts
import { cn, extractYoutubeId } from "@/lib/utils";
```

Then the `code` renderer. Before:

```tsx
      // translate="no": field names, paths, SQL and in-product menu labels must
      // stay verbatim or the reader cannot follow them in the actual product.
      return <code className={className} translate="no">{children}</code>;
```

After:

```tsx
      // translate="no" + notranslate: field names, paths, SQL and in-product
      // menu labels must stay verbatim or the reader cannot follow them in the
      // actual product. Google's widget keys on the class; the attribute is
      // what browsers' own translators read.
      return (
        <code className={cn(className, "notranslate")} translate="no">
          {children}
        </code>
      );
```

`className` arrives `undefined` for inline code, which `cn` handles.

- [ ] **Step 3: Let the chat chrome translate**

In `src/components/chat/floating-chatbot.tsx`, remove the opt-out from the anchor. Before:

```tsx
      {/* Fixed anchor.
          translate="no": the chat streams text into the DOM chunk by chunk, and
          a translator rewriting those nodes mid-stream is the app's biggest
          React-crash surface. This is a real trade-off, not a free win: the
          LLM answer itself is unaffected (it already answers in the language
          of the question), but the whole widget chrome — header, input
          placeholder, welcome copy, suggestion chips, modals — is now
          Thai-only and explicitly opted out of browser translation too. */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[2000000]"
        translate="no"
        style={{
```

After:

```tsx
      {/* Fixed anchor. The widget chrome — header, input placeholder, welcome
          copy, suggestion chips, modals — translates with the rest of the page,
          so a reader who picks Japanese does not get a Thai island in the
          corner. The opt-out lives on the streaming answer body instead
          (StaticHtmlContent in carmen-message.tsx), which is where the
          React-crash risk actually is. */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[2000000]"
        style={{
```

- [ ] **Step 4: Verify**

```bash
grep -rn 'translate="no"' src
```

Expected: exactly two hits outside comments — `carmen-message.tsx` (the `StaticHtmlContent` div) and `markdown-content.tsx` (the `code` element). No hit in `floating-chatbot.tsx`.

```bash
bun run build && bun run lint && bun test --isolate
```

Expected: build succeeds; lint clean apart from the two pre-existing errors; 77 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/carmen-message.tsx src/components/kb/article/markdown-content.tsx src/components/chat/floating-chatbot.tsx
git commit -m "$(cat <<'EOF'
fix(i18n): move the translation opt-out to where the risk is

The streaming answer body and rendered code keep their verbatim text;
the chat chrome now translates with the page. Previously the opt-out sat
on the whole chat widget, which left it a Thai island once an explicit
language control exists.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Full page navigation while translated

**Files:**
- Create: `src/hooks/use-full-navigation-while-translated.ts`
- Modify: `src/root-layout.tsx`

**Interfaces:**
- Consumes: `TRANSLATE_SOURCE_LANG`, `getTranslateLang` from `@/lib/google-translate` (Task 1).
- Produces: `export function useFullNavigationWhileTranslated(): void` from `@/hooks/use-full-navigation-while-translated`. Called once, no arguments.

- [ ] **Step 1: Create the hook**

Create `src/hooks/use-full-navigation-while-translated.ts`:

```ts
import { useEffect } from "react";
import { TRANSLATE_SOURCE_LANG, getTranslateLang } from "@/lib/google-translate";

/**
 * While a translation is active, make internal links do a full page load.
 *
 * Google's widget translates the document it finds at load time. React Router
 * swaps page content without a load, so a client-side navigation would render
 * the next article in Thai while the switcher still reads English. Forcing a
 * real navigation is slower but always correct, and it costs nothing on the
 * only surface Google gives us a stable contract for — the cookie.
 *
 * Readers on Thai, who are the majority, never get past the first check.
 */
export function useFullNavigationWhileTranslated(): void {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (getTranslateLang() === TRANSLATE_SOURCE_LANG) return;
      if (event.defaultPrevented || event.button !== 0) return;
      // Let the browser handle open-in-new-tab and friends.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      window.location.assign(url.href);
    }

    // Capture phase: React Router's Link handler runs in the bubble phase, so
    // this must see the click first to be able to pre-empt it.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);
}
```

- [ ] **Step 2: Install it**

Replace the whole contents of `src/root-layout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import FloatingChatBot from "@/components/chat/floating-chatbot";
import { GoogleTranslateScript } from "@/components/kb/google-translate-script";
import { useFullNavigationWhileTranslated } from "@/hooks/use-full-navigation-while-translated";
import "@/i18n";

export default function RootLayout() {
  useFullNavigationWhileTranslated();

  return (
    <ThemeProvider>
      <GoogleTranslateScript />
      <Outlet />
      <FloatingChatBot />
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Verify**

```bash
bun run build && bun run lint && bun test --isolate
```

Expected: build succeeds; lint clean apart from the two pre-existing errors; 77 tests pass.

Then check the no-op path by hand, since no cookie exists yet: with `bunx vite --port 3301 --strictPort` running, open `http://localhost:3301`, click through to a category and an article, and confirm navigation is still client-side — the page must not flash or re-request `index.html` in the Network panel. That is the majority path, and it must be untouched.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-full-navigation-while-translated.ts src/root-layout.tsx
git commit -m "$(cat <<'EOF'
feat(i18n): full page loads while a translation is active

Google's widget translates the document it finds at load. React Router
swaps content without one, so client-side navigation would serve the
next article untranslated while the switcher said otherwise. One
capture-phase listener turns internal links into real navigations, and
only for readers who opted into translation.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: The header dropdown

**Files:**
- Create: `src/configs/translate-languages.ts`
- Create: `src/components/kb/language-switcher.tsx`
- Modify: `src/messages/th.json` (the `common` block)
- Modify: `src/components/kb/header.tsx` (import; three breakpoint branches at lines 252, 267, 376)

**Interfaces:**
- Consumes: `getTranslateLang`, `setTranslateLang` from `@/lib/google-translate` (Task 1); `TRANSLATE_LANGUAGES` from `@/configs/translate-languages` (this task).
- Produces: `export function LanguageSwitcher(props: { className?: string; fluid?: boolean; toolbar?: boolean }): JSX.Element` from `@/components/kb/language-switcher`. The prop shape mirrors `BUSwitcher` so the two sit side by side in the header with the same variants.

This is the task that makes translation reachable. Everything it depends on is already in place.

- [ ] **Step 1: Create the language list**

Create `src/configs/translate-languages.ts`:

```ts
export type TranslateLanguage = {
  /** Google Translate language code, used as the cookie's target segment. */
  code: string;
  /** The language's own name — someone hunting for their language can always
   *  read it written in that language, but may not read English. */
  label: string;
};

/**
 * The 24 languages offered in the header. Google supports well over a hundred,
 * but a hundred-row dropdown is a dropdown nobody can search. Ordered by who
 * actually reads this KB: Thai and English first, then ASEAN and East Asia,
 * then the rest.
 *
 * `th` is first so the control can show the current state and offer the way
 * back; selecting it clears the cookie rather than writing `/th/th`.
 */
export const TRANSLATE_LANGUAGES: TranslateLanguage[] = [
  { code: "th", label: "ไทย" },
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "km", label: "ភាសាខ្មែរ" },
  { code: "lo", label: "ລາວ" },
  { code: "my", label: "မြန်မာ" },
  { code: "hi", label: "हिन्दी" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "he", label: "עברית" },
  { code: "tr", label: "Türkçe" },
  { code: "fil", label: "Filipino" },
];
```

- [ ] **Step 2: Restore the two i18n keys the previous change removed**

In `src/messages/th.json`, inside the `common` block. Before:

```json
    "buSwitcherPlaceholder": "เลือกหน่วยงาน",
    "contactCenter": "Contact Center"
```

After:

```json
    "buSwitcherPlaceholder": "เลือกหน่วยงาน",
    "languageLabel": "ภาษา",
    "languageHint": "แปลหน้านี้ด้วย Google แปลภาษา",
    "contactCenter": "Contact Center"
```

- [ ] **Step 3: Create the switcher**

Create `src/components/kb/language-switcher.tsx`:

```tsx
"use client";

import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSLATE_LANGUAGES } from "@/configs/translate-languages";
import { getTranslateLang, setTranslateLang } from "@/lib/google-translate";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
  /** Full-width row for the mobile drawer. */
  fluid?: boolean;
  /** Desktop toolbar: compact trigger, no label. */
  toolbar?: boolean;
};

/**
 * Switches the page language through Google's Website Translator.
 *
 * There is no React state: the `googtrans` cookie is the language, and every
 * change reloads so Google's widget re-reads it. Reading the cookie during
 * render is safe because the value cannot change without that reload.
 */
export function LanguageSwitcher({ className, fluid, toolbar }: LanguageSwitcherProps) {
  const t = useTranslations("common");
  const current = getTranslateLang();

  const handleChange = (code: string) => {
    if (code === current) return;
    setTranslateLang(code);
    window.location.reload();
  };

  return (
    <div
      className={cn(
        "flex items-center",
        toolbar
          ? "min-w-0 gap-1.5 border-0 bg-transparent p-0 shadow-none"
          : "gap-2 rounded-xl border border-primary/35 bg-primary/10 px-2 py-1 shadow-sm dark:border-primary/45 dark:bg-primary/15",
        fluid && "w-full min-w-0 flex-wrap sm:flex-nowrap",
        className,
      )}
      title={t("languageHint")}
    >
      <div
        className={cn(
          "flex min-w-0 shrink-0 items-center gap-1",
          toolbar ? "text-muted-foreground" : "text-primary",
        )}
      >
        <Languages className="size-4 shrink-0" aria-hidden />
        {!toolbar && (
          <span className="hidden min-[1200px]:inline text-[11px] font-bold uppercase tracking-wide text-primary">
            {t("languageLabel")}
          </span>
        )}
      </div>
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger
          size={toolbar ? "default" : "sm"}
          aria-label={t("languageLabel")}
          className={cn(
            "font-semibold text-foreground ring-0 focus:ring-2 focus:ring-primary/35 [&>span]:truncate",
            toolbar
              ? "min-w-[6rem] max-w-[10rem] shrink-0 rounded-full border border-input bg-background px-3 text-[13px] leading-tight shadow-none transition-colors duration-150 hover:bg-accent hover:text-white dark:hover:bg-accent dark:hover:text-foreground"
              : "rounded-lg border border-primary/25 bg-background/95 px-2 text-sm shadow-sm hover:bg-background dark:border-primary/35 dark:bg-background/90",
            fluid
              ? "min-w-0 w-full max-w-none flex-1 basis-[10rem]"
              : !toolbar && "min-w-[4.75rem] w-[min(7.25rem,28vw)] max-w-[7.5rem]",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[60vh] rounded-xl">
          {TRANSLATE_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="rounded-lg font-medium">
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

`max-h-[60vh]` on the content keeps a 24-row list scrollable inside the viewport instead of running off it.

- [ ] **Step 4: Wire it into the header — desktop**

In `src/components/kb/header.tsx`, add the import next to the existing `BUSwitcher` one:

```ts
import { LanguageSwitcher } from "./language-switcher";
```

Then the desktop utilities cluster (~line 252). Before:

```tsx
          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-border/60 min-w-0">
            {!isHome && <BUSwitcher toolbar />}
```

After:

```tsx
          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-border/60 min-w-0">
            <LanguageSwitcher toolbar />
            {!isHome && <BUSwitcher toolbar />}
```

- [ ] **Step 5: Wire it into the header — tablet row**

The row at ~line 267. Before:

```tsx
          <div className="xl:hidden ml-auto flex items-center justify-end gap-2 shrink-0">
            <a
              href={ZOHO_CONTACT_CENTER_URL}
```

After:

```tsx
          <div className="xl:hidden ml-auto flex items-center justify-end gap-2 shrink-0">
            <LanguageSwitcher toolbar className="hidden min-[420px]:flex" />
            <a
              href={ZOHO_CONTACT_CENTER_URL}
```

A 24-language dropdown needs more room than the old two-segment TH/EN pill, so it hides below 420px rather than the 360px the old control used. Below that width the mobile menu carries it (next step).

- [ ] **Step 6: Wire it into the header — mobile menu footer**

The footer at ~line 376. Before:

```tsx
                <div className="mt-2 pt-3 border-t border-border/60 space-y-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {!isHome && <BUSwitcher fluid />}
```

After:

```tsx
                <div className="mt-2 pt-3 border-t border-border/60 space-y-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <div className="min-[420px]:hidden">
                    <LanguageSwitcher fluid />
                  </div>
                  {!isHome && <BUSwitcher fluid />}
```

- [ ] **Step 7: Verify**

```bash
bun run build && bun run lint && bun test --isolate
```

Expected: build succeeds; lint clean apart from the two pre-existing errors; 77 tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/configs/translate-languages.ts src/components/kb/language-switcher.tsx src/messages/th.json src/components/kb/header.tsx
git commit -m "$(cat <<'EOF'
feat(i18n): add a 24-language switcher to the header

Our own dropdown, Google's engine underneath. Selecting a language
writes the googtrans cookie and reloads; selecting ไทย clears it.

Chrome never offers to translate a Thai page to a reader whose browser
is set to Thai — which is most of this KB's audience — so relying on the
browser's own prompt left them with no way to read the site in another
language at all.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Survive a DOM-mutating translator

**Files:**
- Create: `src/lib/dom-translation-shim.ts`
- Create: `src/lib/dom-translation-shim.test.ts`
- Modify: `src/main.tsx`
- Modify: `src/components/kb/language-switcher.tsx`
- Modify: `src/components/kb/bu-switcher.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function installDomTranslationShim(): void` from `@/lib/dom-translation-shim`. Called once, from `src/main.tsx`, before `createRoot`.

**Why this task exists — read this before writing anything.**

Task 5 shipped the switcher, and the first end-to-end run found the feature breaking itself. With a translation active, clicking the language dropdown replaces the page with the route's error screen. Reproduced on the dev server **and** on a production build (minified bundle, no Vite client):

```
NotFoundError: Failed to execute 'removeChild' on 'Node':
  The node to be removed is not a child of this node.
The above error occurred in the <Text> component.
React Router caught the following error during render
```

`<Text>` is Radix `Select`'s internal text component. The mechanism: Google's translator replaces text nodes in place, wrapping them in `<font>` elements. React still holds references to the originals, so when it later removes those children it calls `removeChild` with a node whose parent has changed underneath it, and the DOM throws. React has no recovery — the error reaches the nearest boundary, and React Router renders the route's `errorElement` (facebook/react#11538, open since 2017).

The consequence is that the control which turns translation **on** cannot be used to turn it off, so a reader who picks a language is stranded there until they clear the cookie by hand.

Task 3's `notranslate` boundaries covered the chat and rendered code, on the reasoning that those were the highest-risk surfaces. That was half right: the risk is not confined to particular components, it exists anywhere React removes a text node the translator has already moved — dropdowns, menus, tooltips, search results.

This task applies both halves of the fix:

1. **A DOM shim** — the established workaround for React under a DOM-mutating translator, and the only measure that covers components nobody has thought to protect yet.
2. **`notranslate` on the two header select controls** — worth doing on its own merits regardless of the crash: language endonyms (`日本語`, `ไทย`) and business-unit names are proper nouns, and translating them produces nonsense.

- [ ] **Step 1: Write the failing test**

Create `src/lib/dom-translation-shim.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "bun:test";
import { installDomTranslationShim } from "./dom-translation-shim";

beforeAll(() => {
  installDomTranslationShim();
});

describe("installDomTranslationShim", () => {
  it("leaves a normal removeChild working", () => {
    const parent = document.createElement("div");
    const child = document.createElement("span");
    parent.appendChild(child);

    expect(parent.removeChild(child)).toBe(child);
    expect(parent.childNodes.length).toBe(0);
  });

  it("returns the node instead of throwing when the parent no longer matches", () => {
    const parent = document.createElement("div");
    const stranger = document.createElement("span");
    document.createElement("div").appendChild(stranger);

    expect(() => parent.removeChild(stranger)).not.toThrow();
    expect(parent.removeChild(stranger)).toBe(stranger);
  });

  it("leaves a normal insertBefore working", () => {
    const parent = document.createElement("div");
    const reference = document.createElement("span");
    const inserted = document.createElement("b");
    parent.appendChild(reference);

    expect(parent.insertBefore(inserted, reference)).toBe(inserted);
    expect(parent.firstChild).toBe(inserted);
  });

  it("returns the new node instead of throwing when the reference has a different parent", () => {
    const parent = document.createElement("div");
    const inserted = document.createElement("b");
    const stranger = document.createElement("span");
    document.createElement("div").appendChild(stranger);

    expect(() => parent.insertBefore(inserted, stranger)).not.toThrow();
    expect(parent.insertBefore(inserted, stranger)).toBe(inserted);
  });

  it("still appends when insertBefore is given a null reference", () => {
    const parent = document.createElement("div");
    const appended = document.createElement("b");

    expect(parent.insertBefore(appended, null)).toBe(appended);
    expect(parent.lastChild).toBe(appended);
  });

  it("is safe to install more than once", () => {
    installDomTranslationShim();
    installDomTranslationShim();

    const parent = document.createElement("div");
    const child = document.createElement("span");
    parent.appendChild(child);
    expect(parent.removeChild(child)).toBe(child);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test --isolate src/lib/dom-translation-shim.test.ts
```

Expected: FAIL — `Cannot find module './dom-translation-shim'`.

- [ ] **Step 3: Write the shim**

Create `src/lib/dom-translation-shim.ts`:

```ts
/**
 * Let React survive a DOM-mutating translator.
 *
 * Google's Website Translator replaces text nodes in place, wrapping them in
 * <font> elements. React still holds references to the originals, so when it
 * later removes or reorders those children it calls removeChild/insertBefore
 * with a node whose parent changed underneath it, and the DOM throws
 * NotFoundError. React has no recovery: the error reaches the nearest
 * boundary and the page is replaced by an error screen
 * (facebook/react#11538, open since 2017).
 *
 * Returning instead of throwing when the parent no longer matches is the
 * established workaround. It is not a lie to React: the node it wanted
 * removed is already detached — the translator moved it — so returning it
 * reports the outcome React was asking for.
 *
 * This patches a DOM prototype and deserves the suspicion that implies. It is
 * scoped as narrowly as the failure allows: two methods, one guard each, and
 * no behavioural change whatsoever when the parent matches.
 */

let installed = false;

export function installDomTranslationShim(): void {
  if (installed) return;
  if (typeof Node !== "function" || !Node.prototype) return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test --isolate src/lib/dom-translation-shim.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Install it before React mounts**

In `src/main.tsx`, the shim has to run before `createRoot`, because React captures nothing at import time but starts committing DOM the moment it renders. Add the import below the existing `@/styles/globals.css` import, and call it immediately before `createRoot`. Before:

```tsx
import "@/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";

createRoot(document.getElementById("root")!).render(
```

After:

```tsx
import "@/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";
import { installDomTranslationShim } from "@/lib/dom-translation-shim";

// Must run before React commits anything to the DOM.
installDomTranslationShim();

createRoot(document.getElementById("root")!).render(
```

- [ ] **Step 6: Keep proper nouns out of the translator — language switcher**

In `src/components/kb/language-switcher.tsx`, the outer wrapper `div` gains the marker. Before:

```tsx
    <div
      className={cn(
        "flex items-center",
```

After:

```tsx
    // translate="no" + notranslate: the options are language endonyms — ไทย,
    // 日本語, Русский — and the whole point is that a reader recognises their
    // own language's name. Translating them defeats the control.
    <div
      translate="no"
      className={cn(
        "notranslate flex items-center",
```

- [ ] **Step 7: Keep proper nouns out of the translator — BU switcher**

In `src/components/kb/bu-switcher.tsx`, the outer wrapper `div`. Before:

```tsx
    <div
      className={cn(
        "flex items-center",
```

After:

```tsx
    // translate="no" + notranslate: business-unit names ("Carmen Cloud",
    // "Blueledgers") are proper nouns; a translated product name matches
    // nothing the reader will see in the product itself.
    <div
      translate="no"
      className={cn(
        "notranslate flex items-center",
```

- [ ] **Step 8: Verify**

```bash
bun run build && bun run lint && bun test --isolate
```

Expected: build succeeds; lint shows only the two pre-existing errors; the suite is 77 + 6 = 83 passing.

Then check the crash is actually gone, which is the whole point of the task:

```bash
bun run build && bunx vite preview --port 3301 --strictPort
```

A production build is required here — the crash reproduces in both, but this task must be verified against what ships. In the browser at `http://localhost:3301/categories/ap`:

1. In the console, run `document.cookie = "googtrans=/th/en; path=/"` and reload.
2. Confirm the page is translated: `document.documentElement.className` contains `translated-ltr`, and `document.querySelectorAll("font").length` is greater than zero.
3. Click the language dropdown. It must **open**, listing the 24 languages. No error screen, and no `NotFoundError` in the console.
4. Pick `ไทย`. The page reloads in Thai and the cookie is gone.

If step 3 still fails, stop and report BLOCKED — do not add further `notranslate` markers to make it pass, because that would be treating the symptom the shim exists to treat.

- [ ] **Step 9: Commit**

```bash
git add src/lib/dom-translation-shim.ts src/lib/dom-translation-shim.test.ts src/main.tsx src/components/kb/language-switcher.tsx src/components/kb/bu-switcher.tsx
git commit -m "$(cat <<'EOF'
fix(i18n): survive a DOM-mutating translator

Google's translator replaces text nodes in place; React then calls
removeChild on a node whose parent moved and the DOM throws, taking the
page down to an error screen (facebook/react#11538). Reproduced on a
production build by opening the language dropdown while translated —
the control that turns translation on could not turn it off.

Guards removeChild/insertBefore against the mismatch, and marks the two
header select controls notranslate: language endonyms and business-unit
names are proper nouns that should never have been translated.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Manual verification

**Files:** none — this task changes nothing. It exists because Tasks 2-5 ship no automated tests, so a human has to look. Several checks cannot be automated at all: they depend on a third-party script rewriting the DOM.

**Interfaces:** none.

- [ ] **Step 1: Start the dev server and the backend**

The Go backend must be reachable on `:8080` (`curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health` → `200`). Then:

```bash
bunx vite --port 3301 --strictPort
```

Use 3301: the backend's `CORS_ORIGINS` allows only `3301` and `3302`, and 3302 is often taken.

- [ ] **Step 2: Dropdown renders at all three breakpoints**

At ≥1280px, ~700px and ~380px: the control is present and the header layout is intact — nothing wraps, overflows, or overlaps. Below 420px it moves into the hamburger menu's footer; confirm it is there and full-width.

- [ ] **Step 3: English translates the content**

Pick `English`. The page reloads and article prose is English. Check `document.cookie` in the console contains `googtrans=/th/en`.

- [ ] **Step 4: Code stays verbatim**

On `/categories/ap/AP-invoice-by-template` with English active, the inline code still reads `DD/MM/YY` and `VAT07`, untranslated.

- [ ] **Step 5: Chat chrome translates, answers do not**

Open the chat. Its header, input placeholder and suggestion chips are English. Send a Thai question: the answer arrives in Thai and is **not** machine-translated into English.

- [ ] **Step 6: Navigation stays translated**

Still in English, click through to another article. The Network panel shows a full document request (not just an API call), and the new article is English.

- [ ] **Step 7: No Google chrome**

No banner strip at the top of the viewport; the site header sits where it always did. Google's own dropdown is nowhere on the page.

- [ ] **Step 8: Switching back restores everything**

Pick `ไทย`. The page reloads in Thai, `googtrans` is gone from `document.cookie`, and clicking an internal link is client-side again — the Network panel shows no new document request.

- [ ] **Step 8b: The switcher still works while translated**

With English active, open the language dropdown. It must open and list all 24 languages — not replace the page with an error screen. Then pick another language (`日本語`) and confirm the page reloads translated into it.

This is the check that Task 6 exists to make pass. Before the shim it failed on both dev and production builds with `NotFoundError: Failed to execute 'removeChild' on 'Node'`, which meant a reader who picked a language could not pick another one or get back to Thai.

- [ ] **Step 9: No crash while translated**

Switch to `English` (or `日本語`), open the chat, and send a message. Watch it stream to completion. The page must not go blank and the console must show no `NotFoundError: Failed to execute 'removeChild'`.

This is the check the previous change could never run — Chrome would not offer to translate a Thai page for a Thai-configured browser, so this crash path stayed untested.

- [ ] **Step 10: Script failure degrades cleanly**

In DevTools → Network, add a request-blocking rule for `translate.google.com`. With a translation active, reload. Within about eight seconds the site shows its authored Thai and the dropdown reads `ไทย` — not a stale foreign language over untranslated text. Remove the blocking rule afterwards.

- [ ] **Step 11: Report**

Report each of Steps 2-10 as pass or fail with what was observed. Do not mark this task complete on partial results — a failure means reopening the task that owns it, not shipping.

---

## Self-Review

**Spec coverage.** Walked every section of `docs/superpowers/specs/2026-07-29-google-translate-switcher-design.md`:

| Spec section | Covered by |
|---|---|
| §2 in scope: 24-language dropdown | Task 5 |
| §2 in scope: cookie contract module | Task 1 |
| §2 in scope: headless script load | Task 2 |
| §2 in scope: full navigation while translated | Task 4 |
| §2 in scope: `notranslate` boundaries | Task 3 |
| §2 in scope: graceful degradation | Task 2 Step 1 (`giveUp`), verified Task 7 Step 10 |
| §2 non-goals: no backend change, no `en.json`, no Google UI, no auto-detect, no `frontend-next` | Global Constraints |
| §3 decisions (engine, mechanism, languages, labels, chat chrome, chat answers, chat `lang`, SPA, backend) | Tasks 1-5; chat `lang` untouched by construction — no task edits `use-chat-stream.ts` |
| §4 architecture (cookie as sole state) | Task 1 Step 3, Task 5 Step 3 |
| §5 three modules + the 24-language table | Tasks 1, 2, 5 — the list is transcribed entry for entry |
| §5 cookie domain handling | Task 1 Step 3 (`cookieDomains`) |
| §6 click interceptor | Task 4 |
| §7 what must not be translated | Task 3 |
| §8 banner suppression | Task 2 Step 2, with the deviation recorded under Global Constraints |
| §9 script-load failure | Task 2 Step 1 |
| §10 file-by-file map | Tasks 1-5, every file named with line numbers |
| §11 one test file, static checks, 9 manual checks | Task 1 (test), every task (static), Task 6 (manual, expanded to 9 checks across Steps 2-10) |
| §12 risks, incl. no SRI | Global Constraints |
| §13 left alone | Global Constraints |

No gaps.

**Placeholder scan.** No "TBD", "TODO", "similar to Task N", or "add appropriate error handling". Every code step shows the exact before/after text or the complete file. The one thing not spelled out character-for-character is the existing Tailwind class strings on `SelectTrigger`, which are given in full in Task 5 Step 3.

**Type consistency.** `TRANSLATE_SOURCE_LANG`, `getTranslateLang()`, `setTranslateLang(code: string)` and `clearTranslateLang()` are defined in Task 1 Step 3 and used with those exact names and signatures in Task 2 Step 1, Task 4 Step 1 and Task 5 Step 3. `TranslateLanguage` / `TRANSLATE_LANGUAGES` are defined in Task 5 Step 1 and consumed in Task 5 Step 3. `GoogleTranslateScript` (Task 2) and `useFullNavigationWhileTranslated` (Task 4) are both imported in `root-layout.tsx`, whose final form appears in full in Task 4 Step 2 — Task 2 Step 3 shows the intermediate version, which is correct for that commit and superseded by Task 4.
