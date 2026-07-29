# Remove the TH/EN Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the in-app TH/EN language switcher and every trace of a "user-selected locale" from `frontend-react`, so the site is Thai-only and readers use their browser's built-in translation; the chatbot instead detects the language of each message the user types.

**Architecture:** Three deletions and one addition. Delete (a) the switcher UI, (b) the `NEXT_LOCALE` cookie plumbing in `src/lib/locale.ts`, (c) the English UI strings (`en.json` + the `en` block in `configs/locales.ts`), and drop the `?locale=` query parameter from every wiki content fetch. Add one pure function, `detectMessageLang()`, which is the only remaining place the app reasons about language — consumed solely by the chat stream request. Finish by marking the chat window and code blocks `translate="no"` so browser translation cannot mutate React-managed text nodes and crash the page.

**Tech Stack:** React 19, TypeScript, Vite 7, React Router 7, i18next + react-i18next, Bun (runtime, package manager, test runner), Tailwind 4.

**Source spec:** `docs/superpowers/specs/2026-07-29-remove-language-switcher-design.md`

## Global Constraints

- All paths in this plan are relative to `frontend-react/` unless prefixed with `docs/`.
- Package manager and test runner is **Bun**, never npm/yarn. Build: `bun run build` (= `tsc -b && vite build`). Lint: `bun run lint`. Tests: `bun test --isolate`.
- **Do not write new automated tests** anywhere in this plan except the single file `src/lib/detect-message-lang.test.ts`. This is the project's standing rule (`~/.claude/CLAUDE.md` §3, "Skip Automated Tests During Plan Execution"); the one exception was agreed explicitly during brainstorming because the function is pure and the test is the plan's only new logic. Static checks (`tsc`, `eslint`) are **not** tests and must still run.
- **Do not touch the Go backend.** `TranslationService`, `WikiTranslationCache`, the `locale` handling in `internal/api/wiki_handler.go`, and `GOOGLE_TRANSLATE_API_KEY` all stay. They simply stop being called.
- **Do not touch `frontend-next/`.** It is not the deployed frontend.
- `index.html` must keep `<html lang="th">`. It is the only signal browsers use to offer translation.
- Branch: `feature/remove-language-switcher`. Every commit must leave `bun run build` passing.
- Commit messages: conventional commits, ending with the trailer `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

### Deviation from spec §9 (read this before starting)

The spec's commit sequence removes the switcher and `src/lib/locale.ts` (its step 2) **before** cleaning the routes (its step 3). That order does not build: after `src/lib/locale.ts` is deleted, `faq/index.tsx`, `faq/path.tsx`, `categories/category.tsx` and `categories/article.tsx` still `import { getLocaleFromClient } from "@/lib/locale"`. This plan swaps those two steps. Everything else matches the spec.

The spec's §7 measure 3 also names two examples that do not exist in the code: the copy button uses a `title` attribute plus icons (not a swapped text node), and `remaining_queue` has no caller at all. Task 4 below uses the three real conditional text nodes found by grep instead.

---

## File Structure

**Created (2):**

| File | Responsibility |
|---|---|
| `src/lib/detect-message-lang.ts` | One pure function: message text → `"th" \| "en"`. No I/O, no state, no imports. |
| `src/lib/detect-message-lang.test.ts` | Unit tests for the above. |

**Deleted (4):**

| File | Why |
|---|---|
| `src/components/kb/language-switcher.tsx` | The switcher UI. |
| `src/lib/locale.ts` | `NEXT_LOCALE` cookie getter/setter + `locale-changed` event. No callers after Task 2. |
| `src/lib/locale.test.ts` | Tests the file above. |
| `src/messages/en.json` | English UI strings. |

**Modified (14):** `src/hooks/use-chat-stream.ts`, `src/hooks/use-carmen-chat.ts`, `src/lib/wiki-api.ts`, `src/routes/faq/index.tsx`, `src/routes/faq/path.tsx`, `src/routes/categories/category.tsx`, `src/routes/categories/article.tsx`, `src/routes/categories/article.test.tsx`, `src/components/kb/header.tsx`, `src/i18n/index.ts`, `src/i18n/use-translations.ts`, `src/components/kb/toc.tsx`, `src/components/chat/floating-chatbot.tsx`, `src/configs/locales.ts`. Task 4 additionally touches `src/components/kb/article/markdown-content.tsx`, `src/routes/chat.tsx`, `src/components/admin/admin-gate.tsx`, `src/components/activity/activity-log-table.tsx`.

---

## Task 1: `detectMessageLang` and the chat stream

**Files:**
- Create: `src/lib/detect-message-lang.ts`
- Create: `src/lib/detect-message-lang.test.ts`
- Modify: `src/hooks/use-chat-stream.ts` (lines 52, 74, 128)
- Modify: `src/hooks/use-carmen-chat.ts` (line ~460, inside `getStreamDeps`)

**Interfaces:**
- Consumes: nothing.
- Produces: `export type MessageLang = "th" | "en"` and `export function detectMessageLang(text: string): MessageLang` from `@/lib/detect-message-lang`. No later task imports these — Task 1 is the only consumer.

**Why first:** it makes the chat stop depending on `useLocale()`, so Task 3 can delete that export cleanly.

- [ ] **Step 1: Write the failing test**

Create `src/lib/detect-message-lang.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { detectMessageLang } from "./detect-message-lang";

describe("detectMessageLang", () => {
  it("returns th for Thai text", () => {
    expect(detectMessageLang("กดปุ่ม refresh ไม่ได้ ทำยังไง")).toBe("th");
    expect(detectMessageLang("สวัสดี")).toBe("th");
  });

  it("returns en for English text", () => {
    expect(detectMessageLang("How do I create an AP invoice?")).toBe("en");
    expect(detectMessageLang("refresh workbook")).toBe("en");
  });

  it("treats mixed text as Thai (presence rule)", () => {
    expect(detectMessageLang("how to fix ใบกำกับภาษี")).toBe("th");
  });

  it("falls back to th for text with no letters", () => {
    expect(detectMessageLang("")).toBe("th");
    expect(detectMessageLang("   ")).toBe("th");
    expect(detectMessageLang("12345")).toBe("th");
    expect(detectMessageLang("👍🎉")).toBe("th");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test --isolate src/lib/detect-message-lang.test.ts
```

Expected: FAIL — `Cannot find module './detect-message-lang'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/detect-message-lang.ts`:

```ts
export type MessageLang = "th" | "en";

/** Any character in the Thai Unicode block (U+0E00–U+0E7F). */
const THAI_CHAR = /[\u0E00-\u0E7F]/;

/** Any basic Latin letter — used only to tell "English" apart from "no letters at all". */
const LATIN_LETTER = /[A-Za-z]/;

/**
 * Detect the language of a chat message.
 *
 * Pure — no I/O, no state, no user preference. The site has no language
 * switcher; this exists only so the chat backend can pick the language of its
 * status strings ("กำลังค้นหา…") and its "no information found" message. The
 * substantive answer is steered by the LLM prompt, which already matches the
 * language of the incoming message, so a wrong result here is cheap.
 *
 * Presence rule: one Thai character is enough. This KB is Thai-first, so
 * "how to fix ใบกำกับภาษี" counts as Thai. Text with no letters at all (empty,
 * whitespace, digits, emoji) also defaults to Thai.
 */
export function detectMessageLang(text: string): MessageLang {
  if (THAI_CHAR.test(text)) return "th";
  return LATIN_LETTER.test(text) ? "en" : "th";
}
```

The `LATIN_LETTER` branch is load-bearing. A bare `THAI_CHAR.test(text) ? "th" : "en"` returns `"en"` for `""`, `"12345"` and `"👍🎉"`, contradicting both the fourth test above and the spec's §5 table, which say text with no letters falls back to `"th"`.

**Rejected alternative — the ratio rule.** The spec left the mixed-language rule open (presence vs. ratio). The project owner chose the presence rule above, so the ratio rule is not implemented. It is recorded here only so a later reader knows the choice was deliberate:

```ts
// NOT IMPLEMENTED — kept for the record. Note it needs the same no-letters
// guard as the presence rule: without it, "12345" scores 0 and returns "en".
const compact = text.replace(/\s/g, "");
const thaiCount = (compact.match(/[\u0E00-\u0E7F]/g) ?? []).length;
return thaiCount / compact.length > 0.2 ? "th" : "en";
```

Ship the presence rule. Do not add a flag to switch between the two.

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test --isolate src/lib/detect-message-lang.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Wire it into the chat stream request**

In `src/hooks/use-chat-stream.ts`, add the import next to the existing ones at the top of the file:

```ts
import { detectMessageLang } from "@/lib/detect-message-lang";
```

Remove `locale` from the deps interface (line 52). Before:

```ts
export interface StreamDeps {
  api: CarmenApi;
  config: CarmenChatConfig;
  locale: string;
  t: (key: string) => string;
```

After:

```ts
export interface StreamDeps {
  api: CarmenApi;
  config: CarmenChatConfig;
  t: (key: string) => string;
```

Remove it from the destructuring (line 74). Before:

```ts
  const { api, config, locale, t, isProcessingRef, abortController, isUserStopRef, statusTimers, setMessages, setIsTyping, setTypingStatus, loadRoomList } = deps;
```

After:

```ts
  const { api, config, t, isProcessingRef, abortController, isUserStopRef, statusTimers, setMessages, setIsTyping, setTypingStatus, loadRoomList } = deps;
```

Change the request body (line 128). Before:

```ts
        lang: locale,
```

After:

```ts
        lang: detectMessageLang(msgText),
```

- [ ] **Step 6: Stop passing `locale` into the stream deps**

In `src/hooks/use-carmen-chat.ts`, inside `getStreamDeps()` (~line 459). Before:

```ts
  function getStreamDeps() {
    return {
      api, config, locale, t: translator,
      isProcessingRef, abortController, isUserStopRef, statusTimers,
      setMessages, setIsTyping, setTypingStatus,
      loadRoomList,
    };
  }
```

After:

```ts
  function getStreamDeps() {
    return {
      api, config, t: translator,
      isProcessingRef, abortController, isUserStopRef, statusTimers,
      setMessages, setIsTyping, setTypingStatus,
      loadRoomList,
    };
  }
```

Leave the `const locale = config.locale || "th";` on line 135 alone — it still feeds `suggestions` and `translator`, and Task 3 removes it.

- [ ] **Step 7: Verify the build and the full test suite**

```bash
bun run build && bun run lint && bun test --isolate
```

Expected: build succeeds, lint clean, all tests pass (the new file adds 4).

- [ ] **Step 8: Commit**

```bash
git add src/lib/detect-message-lang.ts src/lib/detect-message-lang.test.ts src/hooks/use-chat-stream.ts src/hooks/use-carmen-chat.ts
git commit -m "$(cat <<'EOF'
feat(chat): derive request lang from the message text

The chat used the user's locale preference to tell the backend which
language to answer status strings in. That preference is about to
disappear with the language switcher, so detect the language of each
message instead.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Drop `?locale=` from wiki content fetches

**Files:**
- Modify: `src/lib/wiki-api.ts:365-403` (`getContent`)
- Modify: `src/routes/faq/index.tsx` (lines 13, 73, 82)
- Modify: `src/routes/faq/path.tsx` (lines 13, 68, 78)
- Modify: `src/routes/categories/category.tsx` (lines 14, 51-52, 73)
- Modify: `src/routes/categories/article.tsx` (lines 21, 56, 87-88, 97, 100, 150, 173)
- Modify: `src/routes/categories/article.test.tsx` (lines 39-42)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `getContent(path: string, bu?: string, fetchOptions?: RequestInit)` — the third positional parameter is now `fetchOptions`, not `locale`. Any later edit calling `getContent` must use the three-argument form.

**Why second:** this removes the last four importers of `@/lib/locale`, so Task 3 can delete that file.

- [ ] **Step 1: Remove the `locale` parameter from `getContent`**

In `src/lib/wiki-api.ts`. Before:

```ts
// GET /api/wiki/content/*
// locale: "th" | "en" — when "en", backend translates content via Google Translate (if enabled)
export async function getContent(
  path: string,
  bu?: string,
  locale?: string,
  fetchOptions?: RequestInit,
): Promise<{
```

After:

```ts
// GET /api/wiki/content/*
// The site is Thai-only — readers use the browser's translation. The backend
// still accepts ?locale= and can translate server-side, but nothing sends it.
export async function getContent(
  path: string,
  bu?: string,
  fetchOptions?: RequestInit,
): Promise<{
```

Then, further down the same function. Before:

```ts
  const selectedBU = bu || getSelectedBUClient();
  const params = new URLSearchParams({ bu: selectedBU });
  if (locale) params.set("locale", locale);
  const encodedPath = encodeWikiPathForFetch(path);
```

After:

```ts
  const selectedBU = bu || getSelectedBUClient();
  const params = new URLSearchParams({ bu: selectedBU });
  const encodedPath = encodeWikiPathForFetch(path);
```

- [ ] **Step 2: Update `src/routes/faq/index.tsx`**

Delete line 13:

```ts
import { getLocaleFromClient } from "@/lib/locale";
```

Delete line 73:

```ts
  const locale = getLocaleFromClient();
```

Update the call (line 82). Before:

```ts
      const rawIndex = await getContent(`${FAQ_SLUG}/index.md`, bu, locale, {
        cache: "no-store",
      });
```

After:

```ts
      const rawIndex = await getContent(`${FAQ_SLUG}/index.md`, bu, {
        cache: "no-store",
      });
```

- [ ] **Step 3: Update `src/routes/faq/path.tsx`**

Delete line 13 (`import { getLocaleFromClient } from "@/lib/locale";`) and line 68 (`  const locale = getLocaleFromClient();`). Update the call (line 78). Before:

```ts
      const rawIndex = await getContent(indexRel, bu, locale, {
        cache: "no-store",
      });
```

After:

```ts
      const rawIndex = await getContent(indexRel, bu, {
        cache: "no-store",
      });
```

- [ ] **Step 4: Update `src/routes/categories/category.tsx`**

Delete line 14 (`import { getLocaleFromClient } from "@/lib/locale";`).

Delete the two locale lines (51-52). Before:

```ts
  const contentBu = isChangelog ? DEFAULT_BU : bu;
  const cookieLocale = getLocaleFromClient();
  const locale = isChangelog ? "en" : cookieLocale;
```

After:

```ts
  const contentBu = isChangelog ? DEFAULT_BU : bu;
```

Update the call (line 73). Before:

```ts
      const rawIndex = await getContent(`${category}/index.md`, contentBu, locale, {
        cache: "no-store",
      });
```

After:

```ts
      const rawIndex = await getContent(`${category}/index.md`, contentBu, {
        cache: "no-store",
      });
```

Note what just happened: the changelog category no longer forces `locale="en"`. Changelog markdown is already English, so it was being sent to Google to be "translated" `th→en` on every request. It is now served raw.

- [ ] **Step 5: Update `src/routes/categories/article.tsx`**

Delete line 21 (`import { getLocaleFromClient } from "@/lib/locale";`).

Delete `locale: string;` from the `ArticleLoaderOk` type (line 56). Before:

```ts
  bu: string;
  contentBu: string;
  locale: string;
  catLower: string;
```

After:

```ts
  bu: string;
  contentBu: string;
  catLower: string;
```

Delete the two locale lines (87-88). Before:

```ts
  const bu = getSelectedBUClient();
  const cookieLocale = getLocaleFromClient();
  const isChangelogCategory = category.toLowerCase() === "changelog";
  const contentBu = isChangelogCategory ? DEFAULT_BU : bu;
  const locale = isChangelogCategory ? "en" : cookieLocale;
```

After:

```ts
  const bu = getSelectedBUClient();
  const isChangelogCategory = category.toLowerCase() === "changelog";
  const contentBu = isChangelogCategory ? DEFAULT_BU : bu;
```

Update both calls (lines 97 and 100). Before:

```ts
    raw = await getContent(primaryPath, contentBu, locale, { cache: "no-store" });
  } catch {
    try {
      raw = await getContent(folderIndexPath, contentBu, locale, {
        cache: "no-store",
      });
```

After:

```ts
    raw = await getContent(primaryPath, contentBu, { cache: "no-store" });
  } catch {
    try {
      raw = await getContent(folderIndexPath, contentBu, {
        cache: "no-store",
      });
```

Fix the date locale (line 150). Before:

```ts
  const dateLocale = locale === "en" ? "en-US" : "th-TH";
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString(dateLocale, {
```

After:

```ts
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString("th-TH", {
```

Delete `locale,` from the loader's return object (line 173). Before:

```ts
    bu,
    contentBu,
    locale,
    catLower,
```

After:

```ts
    bu,
    contentBu,
    catLower,
```

- [ ] **Step 6: Remove the dead mock in `src/routes/categories/article.test.tsx`**

Delete lines 39-42:

```ts
mock.module("@/lib/locale", () => ({
  getLocaleFromClient: jest.fn().mockReturnValue("th"),
  setLocaleCookie: jest.fn(),
}));
```

- [ ] **Step 7: Verify no `?locale=` and no stray callers remain**

```bash
grep -rn "getLocaleFromClient" src/routes src/components
grep -rn 'params.set("locale"' src/lib
```

Expected: both print nothing.

```bash
bun run build && bun run lint && bun test --isolate
```

Expected: build succeeds, lint clean, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/wiki-api.ts src/routes/faq/index.tsx src/routes/faq/path.tsx src/routes/categories/category.tsx src/routes/categories/article.tsx src/routes/categories/article.test.tsx
git commit -m "$(cat <<'EOF'
refactor(wiki): stop sending ?locale= on content fetches

Content is served as authored and the browser translates it if the
reader asks. This also drops the forced locale="en" on the changelog
category, which sent already-English markdown to Google to be
translated th->en on every request.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Delete the switcher and the locale plumbing

**Files:**
- Delete: `src/components/kb/language-switcher.tsx`, `src/lib/locale.ts`, `src/lib/locale.test.ts`, `src/messages/en.json`
- Modify: `src/components/kb/header.tsx` (line 14 import; usages at 254, 271, 383)
- Modify: `src/i18n/index.ts` (whole file)
- Modify: `src/i18n/use-translations.ts` (remove `useLocale`)
- Modify: `src/components/kb/toc.tsx` (lines 4, 19, 54, 102)
- Modify: `src/components/chat/floating-chatbot.tsx` (lines 8, 9, 27, ~59)
- Modify: `src/configs/locales.ts` (`LocaleKey`, whole `en` block)
- Modify: `src/hooks/use-carmen-chat.ts` (lines 8, 36, 135, 171, 176)
- Modify: `src/i18n/use-translations.test.tsx` — **found during execution, not in the original plan.** It forces `i18n.changeLanguage("en")` in a `beforeAll` and asserts `"Home"`, which breaks once the `en` resource bundle is gone. Delete the `beforeAll` block and its comment (it existed only to be deterministic when `lng` came from a cookie) and change both assertions to `"หน้าหลัก"`. No new cases.

**Interfaces:**
- Consumes: `getContent` in its three-argument form from Task 2 (nothing here calls it, but the build must stay green).
- Produces: `useTranslations` remains exported from `@/i18n/use-translations`; `useLocale` no longer exists. `locales` in `@/configs/locales` becomes `Record<"th", LocaleStrings>` — index it as `locales.th`.

All of these move together because deleting the `useLocale` export breaks its three consumers at compile time.

- [ ] **Step 1: Remove the switcher from the header**

In `src/components/kb/header.tsx`, delete the import on line 14:

```ts
import { LanguageSwitcher } from "./language-switcher";
```

Desktop utilities (~line 253). Before:

```tsx
          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-border/60 min-w-0">
            <LanguageSwitcher />
            {!isHome && <BUSwitcher toolbar />}
```

After:

```tsx
          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-border/60 min-w-0">
            {!isHome && <BUSwitcher toolbar />}
```

Tablet row (~line 269). Before:

```tsx
          <div className="xl:hidden ml-auto flex items-center justify-end gap-2 shrink-0">
            <div className="shrink-0 hidden min-[360px]:block">
              <LanguageSwitcher />
            </div>
            <a
```

After:

```tsx
          <div className="xl:hidden ml-auto flex items-center justify-end gap-2 shrink-0">
            <a
```

Mobile menu footer (~line 381). Before:

```tsx
                <div className="mt-2 pt-3 border-t border-border/60 space-y-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <div className="min-[360px]:hidden">
                    <LanguageSwitcher />
                  </div>
                  {!isHome && <BUSwitcher fluid />}
```

After:

```tsx
                <div className="mt-2 pt-3 border-t border-border/60 space-y-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {!isHome && <BUSwitcher fluid />}
```

- [ ] **Step 2: Reduce i18next to a single language**

Replace the whole contents of `src/i18n/index.ts` with:

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import th from "@/messages/th.json";

// The site is Thai-only — there is no language switcher, and readers who want
// another language use their browser's translation. i18next is kept as the one
// place UI strings live, so adding a language later means adding a resource
// file rather than rewiring components.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { th: { translation: th } },
    lng: "th",
    fallbackLng: "th",
    interpolation: {
      prefix: "{",
      suffix: "}",
      escapeValue: false,
    },
    keySeparator: ".",
    nsSeparator: false,
    returnNull: false,
  });
}

export default i18n;
```

- [ ] **Step 3: Remove the `useLocale` hook**

Replace the whole contents of `src/i18n/use-translations.ts` with:

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
```

- [ ] **Step 4: Fix the two `useLocale` consumers — TOC**

In `src/components/kb/toc.tsx`, line 4. Before:

```ts
import { useLocale, useTranslations } from "@/i18n/use-translations";
```

After:

```ts
import { useTranslations } from "@/i18n/use-translations";
```

Delete line 19 (`  const locale = useLocale();`).

Line 54. Before: `  }, [locale]);` — After: `  }, []);`

Line 102. Before: `  }, [headings, locale]);` — After: `  }, [headings]);`

Behaviour is unchanged: `locale` never varied within a page view, it only changed when the (now deleted) switcher fired.

- [ ] **Step 5: Fix the two `useLocale` consumers — floating chatbot**

In `src/components/chat/floating-chatbot.tsx`, lines 8-9. Before:

```ts
import { useLocale, useTranslations } from "@/i18n/use-translations";
import type { LocaleKey } from "@/configs/locales";
```

After:

```ts
import { useTranslations } from "@/i18n/use-translations";
```

Delete line 27 (`  const locale = useLocale();`).

In the `useCarmenChat({...})` call (~line 59), delete the line:

```ts
    locale: locale as LocaleKey,
```

- [ ] **Step 6: Delete the English chat strings**

In `src/configs/locales.ts`, line 3. Before:

```ts
export type LocaleKey = "th" | "en";
```

After:

```ts
export type LocaleKey = "th";
```

Then delete the entire `en: { … }` block from the `locales` object — everything from the line `  en: {` down to and including its closing `  }`, leaving the `th` block and the object's closing `};`. The result must end like this:

```ts
    tools: {
      copy: "คัดลอกข้อมูล",
      copied: "คัดลอกแล้ว!",
      helpful: "มีประโยชน์",
      incorrect: "ไม่ถูกต้อง",
      scroll_down: "เลื่อนลงล่างสุด",
      attach: "แนบรูป",
      send: "ส่งข้อความ",
    }
  }
};
```

- [ ] **Step 7: Fix `use-carmen-chat.ts`**

Line 8. Before:

```ts
import { locales, LocaleKey } from "@/configs/locales";
```

After:

```ts
import { locales } from "@/configs/locales";
```

Delete `  locale?: LocaleKey;` from the `CarmenChatConfig` interface (line 36).

Delete line 135 and its surrounding blank lines:

```ts
  const locale = config.locale || "th";
```

Line 171. Before:

```ts
  const suggestions = config.suggestedQuestions ?? locales[locale].welcome.default_suggestions;
```

After:

```ts
  const suggestions = config.suggestedQuestions ?? locales.th.welcome.default_suggestions;
```

Line 176. Before:

```ts
    let current: unknown = locales[locale];
```

After:

```ts
    let current: unknown = locales.th;
```

- [ ] **Step 8: Delete the four dead files**

```bash
git rm src/components/kb/language-switcher.tsx src/lib/locale.ts src/lib/locale.test.ts src/messages/en.json
```

- [ ] **Step 9: Verify nothing references the removed symbols**

```bash
grep -rn "useLocale\|LanguageSwitcher\|NEXT_LOCALE\|locale-changed\|messages/en" src
```

Expected: prints nothing.

```bash
bun run build && bun run lint && bun test --isolate
```

Expected: build succeeds, lint clean, all tests pass (three fewer than before — `locale.test.ts` is gone).

- [ ] **Step 10: Commit**

```bash
git add -A src/components/kb/header.tsx src/i18n src/components/kb/toc.tsx src/components/chat/floating-chatbot.tsx src/configs/locales.ts src/hooks/use-carmen-chat.ts src/components/kb/language-switcher.tsx src/lib/locale.ts src/lib/locale.test.ts src/messages/en.json
git commit -m "$(cat <<'EOF'
feat(i18n): remove the TH/EN switcher, site is Thai-only

Deletes the switcher, the NEXT_LOCALE cookie plumbing and the English UI
strings. i18next stays as the single home for UI copy, now with one
resource file, so adding a language later is additive.

Readers who want another language use their browser's built-in
translation, which covers article bodies too — those were already
machine-translated server-side.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Survive browser translation

**Files:**
- Modify: `src/components/chat/floating-chatbot.tsx` (the "Fixed anchor" div, ~line 105)
- Modify: `src/components/kb/article/markdown-content.tsx:279-285` (the `code` renderer)
- Modify: `src/routes/chat.tsx:53`
- Modify: `src/components/admin/admin-gate.tsx:57`
- Modify: `src/components/activity/activity-log-table.tsx:134`
- Modify: `src/hooks/use-carmen-chat.ts` (stale comment — see Step 4)
- Modify: `src/messages/th.json` (orphaned keys — see Step 4)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing importable. Markup and copy only.

**Background:** browser translation replaces text nodes in place. React later tries to remove a node that is no longer where it left it and throws `NotFoundError: Failed to execute 'removeChild' on 'Node'`, blanking the page (facebook/react#11538). The two highest-value defences are excluding the streaming chat from translation and excluding code from translation; the third is wrapping the few bare conditional text nodes that swap after mount.

- [ ] **Step 1: Exclude the chat widget from translation**

In `src/components/chat/floating-chatbot.tsx`, the "Fixed anchor" wrapper — it contains both the desktop and mobile chat windows, so one attribute covers both. Before:

```tsx
      {/* Fixed anchor */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[2000000]"
        style={{
          "--carmen-theme": theme,
          "--carmen-theme-low": `${theme}dd`
        } as React.CSSProperties}
      >
```

After:

```tsx
      {/* Fixed anchor.
          translate="no": the chat streams text into the DOM chunk by chunk, and
          a translator rewriting those nodes mid-stream is the app's biggest
          React-crash surface. Nothing is lost — the LLM already answers in the
          language of the question, so asking in English yields native English. */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[2000000]"
        translate="no"
        style={{
          "--carmen-theme": theme,
          "--carmen-theme-low": `${theme}dd`
        } as React.CSSProperties}
      >
```

- [ ] **Step 2: Exclude code from translation**

In `src/components/kb/article/markdown-content.tsx`, the `code` component (~line 279). Before:

```tsx
    code: ({ className, children }) => {
      const code = String(children).trim();
      if (className?.includes("mermaid")) {
        return <MermaidDiagram chart={code} />;
      }
      return <code className={className}>{children}</code>;
    },
```

After:

```tsx
    code: ({ className, children }) => {
      const code = String(children).trim();
      if (className?.includes("mermaid")) {
        return <MermaidDiagram chart={code} />;
      }
      // translate="no": field names, paths, SQL and in-product menu labels must
      // stay verbatim or the reader cannot follow them in the actual product.
      return <code className={className} translate="no">{children}</code>;
    },
```

- [ ] **Step 3: Wrap the three bare conditional text nodes**

These are the only places in `src/` where a text node — not an attribute, not an icon — swaps after mount. Each gets a `<span>` so React reconciles an element it owns rather than a text node the translator may have replaced.

`src/routes/chat.tsx:53`. Before:

```tsx
          <Button type="submit" disabled={loading}>
            {loading ? "กำลังค้นและตอบ..." : "ส่งคำถาม"}
          </Button>
```

After:

```tsx
          <Button type="submit" disabled={loading}>
            <span>{loading ? "กำลังค้นและตอบ..." : "ส่งคำถาม"}</span>
          </Button>
```

`src/components/admin/admin-gate.tsx:57`. Before:

```tsx
            {busy ? "กำลังตรวจสอบ…" : "Unlock"}
```

After:

```tsx
            <span>{busy ? "กำลังตรวจสอบ…" : "Unlock"}</span>
```

`src/components/activity/activity-log-table.tsx:134`. Before:

```tsx
                          {isAdmin ? "แอดมิน/ระบบ" : "ผู้ใช้"}
```

After:

```tsx
                          <span>{isAdmin ? "แอดมิน/ระบบ" : "ผู้ใช้"}</span>
```

- [ ] **Step 4: Sweep the two leftovers Task 3's review surfaced**

Neither affects behaviour; both are references to the language concept this plan removed, so they belong with the last cleanup task rather than in a separate commit.

In `src/hooks/use-carmen-chat.ts`, the comment above `translator` still points at a config field that no longer exists. Before:

```ts
  // Locale-aware translator that respects config.locale
```

After:

```ts
  // Resolves against the Thai chat strings; falls back to the i18n hook for missing keys.
```

In `src/messages/th.json`, delete the two keys whose only consumer was the deleted switcher. Before:

```json
    "buSwitcherPlaceholder": "เลือกหน่วยงาน",
    "languageLabel": "ภาษา",
    "languageHint": "สลับภาษาไทย / อังกฤษสำหรับเนื้อหาที่รองรับ",
    "contactCenter": "Contact Center"
```

After:

```json
    "buSwitcherPlaceholder": "เลือกหน่วยงาน",
    "contactCenter": "Contact Center"
```

Confirm nothing else reads them:

```bash
grep -rn "languageLabel\|languageHint" src
```

Expected: prints nothing.

- [ ] **Step 5: Verify the build**

```bash
bun run build && bun run lint && bun test --isolate
```

Expected: build succeeds, lint clean, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/floating-chatbot.tsx src/components/kb/article/markdown-content.tsx src/routes/chat.tsx src/components/admin/admin-gate.tsx src/components/activity/activity-log-table.tsx src/hooks/use-carmen-chat.ts src/messages/th.json
git commit -m "$(cat <<'EOF'
fix(ui): keep browser translation from crashing React

Marks the chat widget and rendered code blocks translate="no", and wraps
the three bare conditional text nodes in spans. Browser translators
replace text nodes in place; React then throws NotFoundError on
removeChild and blanks the page (facebook/react#11538).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Manual verification

**Files:** none — this task changes nothing. It exists because the plan writes no automated tests for Tasks 2-4, so a human has to look.

**Interfaces:** none.

- [ ] **Step 1: Start the dev server**

```bash
bun run dev
```

Opens on `http://localhost:3302`.

- [ ] **Step 2: Check the header at three widths**

Resize the window to ≥1280px (`xl`), then ~700px, then ~340px. At each width: no TH/EN control anywhere, and no empty gap or misaligned row where it used to be. The mobile hamburger menu's footer should show the BU switcher and theme toggle with no blank slot above them.

- [ ] **Step 3: Check content requests carry no locale**

Open DevTools → Network → filter `content`. Visit a category page, an article, and `/faq`. Every `/api/wiki/content/...` request URL must have `?bu=<slug>` and **no** `locale` parameter. All three pages render normally.

- [ ] **Step 4: Check the changelog**

Visit `/categories/changelog` and open one entry. It renders in English exactly as before — now straight from the markdown, with no call out to Google.

- [ ] **Step 5: Check chat language detection**

Open the floating chat. Send a Thai question: the status line under the bot bubble is Thai ("กำลังค้นหาและคัดกรองข้อมูล..."). Start a new chat and send an English question: the status line is English ("Searching knowledge base..."). Both answer in the language asked.

- [ ] **Step 6: Check browser translation**

In Chrome, on an article page with a code block, right-click → "Translate to English". Confirm: prose translates; text inside code blocks stays verbatim; opening the chat shows Thai UI untouched by the translator.

- [ ] **Step 7: Check for the crash**

With translation still active from Step 6, open the chat and send a message. Watch it stream to completion. The page must not go blank and the console must show no `NotFoundError: Failed to execute 'removeChild'`.

- [ ] **Step 8: Record the result**

Report each of Steps 2-7 as pass or fail with what was observed. Do not mark this task complete on partial results — a failure here means reopening the relevant task, not shipping.

---

## Self-Review

**Spec coverage.** Walked every section of `docs/superpowers/specs/2026-07-29-remove-language-switcher-design.md`:

| Spec section | Covered by |
|---|---|
| §1 in-scope: delete switcher / cookie / EN strings | Task 3 |
| §1 in-scope: drop `?locale=` | Task 2 |
| §1 in-scope: add `detectMessageLang` and wire it | Task 1 |
| §1 in-scope: `translate="no"` + defensive markup | Task 4 |
| §1 non-goals: no backend change, no `frontend-next`, no widget, no hint banner | Global Constraints |
| §5 module contract + both rule variants | Task 1 Step 3 |
| §6 delete list (4 files) | Task 3 Step 8 |
| §6 modify list (13 files + 1 test) | Tasks 1-3, every file named with line numbers |
| §7 three mitigations | Task 4 Steps 1-3 |
| §8 affected existing tests | Task 2 Step 6 (`article.test.tsx`), Task 3 Step 8 (`locale.test.ts`) |
| §8 new test file | Task 1 Steps 1-4 |
| §8 static checks | end of every task |
| §8 six manual checks | Task 5 Steps 2-7 |
| §9 commit sequence | Tasks 1-4, with the ordering swap documented under Global Constraints |
| §10 risks / §11 left alone | Global Constraints |

No gaps.

**Placeholder scan.** No "TBD", "TODO", "similar to Task N", or "add appropriate error handling". Every code step shows before/after text. The one open decision — presence rule vs ratio rule in Task 1 Step 3 — ships a complete, runnable default with the alternative given in full, so an implementer who skips the decision still produces working code.

**Type consistency.** `detectMessageLang(text: string): MessageLang` is defined in Task 1 Step 3 and called with that exact signature in Task 1 Step 5. `getContent` becomes `(path, bu?, fetchOptions?)` in Task 2 Step 1 and every one of the five call sites in Steps 2-5 uses the three-argument form. `locales` stays typed `Record<LocaleKey, LocaleStrings>` with `LocaleKey` narrowed to `"th"` in Task 3 Step 6, and both readers in Step 7 use `locales.th`. `useTranslations` keeps its signature; `useLocale` is removed in Task 3 Step 3 and all three of its consumers are fixed in the same task (Steps 4, 5, and the deleted switcher file).
