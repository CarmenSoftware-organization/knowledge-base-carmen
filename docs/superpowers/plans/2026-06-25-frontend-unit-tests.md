# Frontend Unit Tests (Regression Suite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `bun test` unit tests for the highest-risk pure-logic helpers in `frontend-next/lib/` to guard against regressions.

**Architecture:** Characterization/regression tests — the target functions already exist and work; each test pins their current behavior so refactors/deploys can't silently break routing, API response handling, or chatbot output formatting. One test file per `lib` module, in the existing flat `frontend-next/__tests__/` directory, using the existing `bun test` + `test-setup.ts` (happy-dom) setup. No new dependencies.

**Tech Stack:** TypeScript, `bun:test`, happy-dom (already preloaded via `test-setup.ts`), `@/` path alias.

## Global Constraints

- **Working directory for all commands:** `frontend-next/` (run `cd frontend-next` first).
- **Test runner:** `bun test` (bun 1.3.14). Test files live in `frontend-next/__tests__/`, named `*.test.ts`, auto-discovered.
- **No new dependencies.** Use only `bun:test` and the globals happy-dom provides (`document`, `localStorage`, `window`, `Response`, `AbortSignal`, `DOMException`, `crypto`).
- **`describe` / `it` / `expect` are bun-test globals** (no import needed — matches existing `__tests__/url-safety.test.ts` style). Import `mock`, `spyOn`, `beforeEach`, `afterEach` from `"bun:test"` only where used.
- **Import targets via the `@/` alias** (e.g. `@/lib/wiki-api`).
- **These tests must PASS against the current code.** They are not red-green TDD against new code. If a test you wrote per this plan FAILS, first verify the test itself is correct. If the failure reveals a genuine bug in `lib/` source, **STOP and ask the user** — do **not** modify `lib/` source in this plan.
- **Do not modify any file under `lib/`.** This plan only adds files under `__tests__/`.
- **Mock isolation:** any test that reassigns `globalThis.fetch` or mutates `document.cookie` / `localStorage` must restore/clear state in `afterEach` (or `beforeEach`) so the 5 existing test files stay green.

---

### Task 1: `wikiPathToRoute` + path helpers tests (Tier 1)

**Files:**
- Create: `frontend-next/__tests__/wiki-api-paths.test.ts`

**Interfaces:**
- Consumes (existing exports from `@/lib/wiki-api`):
  - `wikiPathToRoute(path: string): string`
  - `wikiDirFromContentPath(path: string): string`
  - `resolveWikiMarkdownHref(href: string, wikiArticleDir: string | undefined, category: string): string`
  - `normalizeWikiRelPath(path: string): string`
  - `encodeWikiPathForFetch(path: string): string`
- Produces: a passing test file (no exports).

- [ ] **Step 1: Write the test file**

```ts
// frontend-next/__tests__/wiki-api-paths.test.ts
import {
  wikiPathToRoute,
  wikiDirFromContentPath,
  resolveWikiMarkdownHref,
  normalizeWikiRelPath,
  encodeWikiPathForFetch,
} from "@/lib/wiki-api";

describe("wikiPathToRoute", () => {
  it("maps root index.md to /", () => {
    expect(wikiPathToRoute("index.md")).toBe("/");
  });

  it("maps a root-level file to /categories/root/<slug>", () => {
    expect(wikiPathToRoute("getting-started.md")).toBe(
      "/categories/root/getting-started",
    );
  });

  it("maps a category index.md to /categories/<category>", () => {
    expect(wikiPathToRoute("ap/index.md")).toBe("/categories/ap");
  });

  it("maps a nested index.md to /categories/<category>/<middle>", () => {
    expect(wikiPathToRoute("ap/sub/index.md")).toBe("/categories/ap/sub");
  });

  it("maps a category file to /categories/<category>/<slug>", () => {
    expect(wikiPathToRoute("ap/invoice.md")).toBe("/categories/ap/invoice");
  });

  it("maps a deeply nested file to include the middle segments", () => {
    expect(wikiPathToRoute("ap/sub/invoice.md")).toBe(
      "/categories/ap/sub/invoice",
    );
  });

  it("normalizes backslash separators", () => {
    expect(wikiPathToRoute("ap\\invoice.md")).toBe("/categories/ap/invoice");
  });

  it("strips query and hash before routing", () => {
    expect(wikiPathToRoute("ap/invoice.md?x=1#frag")).toBe(
      "/categories/ap/invoice",
    );
  });

  it("filters '.' and '..' segments", () => {
    expect(wikiPathToRoute("ap/./../invoice.md")).toBe(
      "/categories/ap/invoice",
    );
  });

  it("url-encodes Thai/spaced segments", () => {
    const route = wikiPathToRoute("คู่มือ/index.md");
    expect(route.startsWith("/categories/")).toBe(true);
    expect(route).toBe(`/categories/${encodeURIComponent("คู่มือ")}`);
  });
});

describe("normalizeWikiRelPath", () => {
  it("converts backslashes to slashes and NFC-normalizes segments", () => {
    expect(normalizeWikiRelPath("ap\\invoice.md")).toBe("ap/invoice.md");
  });

  it("does not throw on a segment that cannot be decoded", () => {
    expect(() => normalizeWikiRelPath("%E0%")).not.toThrow();
    expect(normalizeWikiRelPath("%E0%")).toBe("%E0%");
  });
});

describe("encodeWikiPathForFetch", () => {
  it("encodes spaces per segment", () => {
    expect(encodeWikiPathForFetch("ap/my file.md")).toBe("ap/my%20file.md");
  });

  it("encodes double quotes per segment", () => {
    expect(encodeWikiPathForFetch('a/"quote".md')).toBe("a/%22quote%22.md");
  });
});

describe("wikiDirFromContentPath", () => {
  it("strips the trailing filename", () => {
    expect(wikiDirFromContentPath("ap/invoice.md")).toBe("ap");
  });

  it("strips a trailing /index.md", () => {
    expect(wikiDirFromContentPath("ap/sub/index.md")).toBe("ap/sub");
  });

  it("returns empty string for empty input", () => {
    expect(wikiDirFromContentPath("")).toBe("");
  });
});

describe("resolveWikiMarkdownHref", () => {
  it("returns external/special hrefs unchanged", () => {
    expect(resolveWikiMarkdownHref("https://x.com/a", "ap", "ap")).toBe(
      "https://x.com/a",
    );
    expect(resolveWikiMarkdownHref("mailto:a@b.com", "ap", "ap")).toBe(
      "mailto:a@b.com",
    );
    expect(resolveWikiMarkdownHref("#section", "ap", "ap")).toBe("#section");
  });

  it("returns an existing app route unchanged", () => {
    expect(resolveWikiMarkdownHref("/categories/ap/x", "ap", "ap")).toBe(
      "/categories/ap/x",
    );
    expect(resolveWikiMarkdownHref("/faq/x", "ap", "ap")).toBe("/faq/x");
  });

  it("resolves a relative link against the article dir", () => {
    expect(resolveWikiMarkdownHref("invoice.md", "ap/sub", "ap")).toBe(
      "/categories/ap/sub/invoice",
    );
  });

  it("treats a leading-slash link as repo-root relative", () => {
    expect(resolveWikiMarkdownHref("/other.md", "ap/sub", "ap")).toBe(
      "/categories/root/other",
    );
  });

  it("falls back to the category when no article dir is given", () => {
    expect(resolveWikiMarkdownHref("invoice.md", undefined, "ap")).toBe(
      "/categories/ap/invoice",
    );
  });
});
```

- [ ] **Step 2: Run the test file**

Run: `cd frontend-next && bun test __tests__/wiki-api-paths.test.ts`
Expected: PASS (all tests green). If any FAIL, re-read the Global Constraints failure rule.

- [ ] **Step 3: Commit**

```bash
cd frontend-next && git add __tests__/wiki-api-paths.test.ts
git commit -m "test(frontend): cover wiki-api path/route helpers"
```

---

### Task 2: `fetch-utils` tests — apiJson + fetchWithTimeout (Tier 1)

**Files:**
- Create: `frontend-next/__tests__/fetch-utils.test.ts`

**Interfaces:**
- Consumes (existing exports from `@/lib/fetch-utils`):
  - `apiJson<T>(input, init?, timeoutMs?): Promise<{ data: T; meta?: Meta }>`
  - `fetchWithTimeout(input, init?, timeoutMs?): Promise<Response>`
  - `ApiError` (class with `.code: string`, `.status: number`)
- Produces: a passing test file (no exports).

- [ ] **Step 1: Write the test file**

```ts
// frontend-next/__tests__/fetch-utils.test.ts
import { mock, spyOn, afterEach } from "bun:test";
import { apiJson, fetchWithTimeout, ApiError } from "@/lib/fetch-utils";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchWithTimeout", () => {
  it("passes an AbortSignal to fetch", async () => {
    let received: RequestInit | undefined;
    globalThis.fetch = mock(async (_input: unknown, init: RequestInit) => {
      received = init;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    await fetchWithTimeout("http://x/", {}, 1000);
    expect(received?.signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts the request when the timeout elapses", async () => {
    globalThis.fetch = mock(
      (_input: unknown, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;

    await expect(fetchWithTimeout("http://x/", {}, 5)).rejects.toThrow();
  });

  it("clears the timeout timer after a successful response", async () => {
    const clearSpy = spyOn(globalThis, "clearTimeout");
    globalThis.fetch = mock(
      async () => new Response("{}", { status: 200 }),
    ) as unknown as typeof fetch;

    await fetchWithTimeout("http://x/", {}, 1000);
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe("apiJson", () => {
  it("unwraps a successful envelope into { data, meta }", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(
          JSON.stringify({ success: true, data: { a: 1 }, meta: { total: 3 } }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const out = await apiJson<{ a: number }>("http://x/");
    expect(out.data).toEqual({ a: 1 });
    expect(out.meta).toEqual({ total: 3 });
  });

  it("throws ApiError with code and status on success:false", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(
          JSON.stringify({ success: false, error: { code: "BAD", message: "nope" } }),
          { status: 400 },
        ),
    ) as unknown as typeof fetch;

    try {
      await apiJson("http://x/");
      throw new Error("expected apiJson to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("BAD");
      expect((e as ApiError).status).toBe(400);
    }
  });

  it("returns a legacy flat body unchanged when there is no success flag and res.ok", async () => {
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ items: [1, 2] }), { status: 200 }),
    ) as unknown as typeof fetch;

    const out = await apiJson<{ items: number[] }>("http://x/");
    expect(out.data).toEqual({ items: [1, 2] });
  });

  it("throws ApiError('HTTP_ERROR') for a flat body when res is not ok", async () => {
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ whatever: true }), { status: 500 }),
    ) as unknown as typeof fetch;

    try {
      await apiJson("http://x/");
      throw new Error("expected apiJson to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("HTTP_ERROR");
      expect((e as ApiError).status).toBe(500);
    }
  });

  it("treats invalid JSON as a null body and returns { data: null } when res.ok", async () => {
    globalThis.fetch = mock(
      async () => new Response("not json", { status: 200 }),
    ) as unknown as typeof fetch;

    const out = await apiJson("http://x/");
    expect(out.data).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test file**

Run: `cd frontend-next && bun test __tests__/fetch-utils.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 3: Commit**

```bash
cd frontend-next && git add __tests__/fetch-utils.test.ts
git commit -m "test(frontend): cover fetch-utils apiJson envelope + fetchWithTimeout"
```

---

### Task 3: `formatCarmenMessage` tests (Tier 1)

**Files:**
- Create: `frontend-next/__tests__/carmen-formatter.test.ts`

**Interfaces:**
- Consumes (existing export from `@/lib/carmen-formatter`):
  - `formatCarmenMessage(text: string, apiBase: string): string`
- Produces: a passing test file (no exports).

Note: assert on key HTML fragments (`toContain` / `toMatch`), never whole-string equality — the function injects long inline-style strings that would make exact matches brittle.

- [ ] **Step 1: Write the test file**

```ts
// frontend-next/__tests__/carmen-formatter.test.ts
import { formatCarmenMessage } from "@/lib/carmen-formatter";

const API = "http://localhost:8080";

describe("formatCarmenMessage", () => {
  it("returns empty string for empty input", () => {
    expect(formatCarmenMessage("", API)).toBe("");
  });

  it("renders inline bold markdown", () => {
    expect(formatCarmenMessage("**hi**", API)).toContain("<b>hi</b>");
  });

  it("renders inline italic and code markdown", () => {
    const out = formatCarmenMessage("*em* and `code`", API);
    expect(out).toContain("<i>em</i>");
    expect(out).toContain('<code class="carmen-inline-code">code</code>');
  });

  it("renders a level-2 heading", () => {
    expect(formatCarmenMessage("## Title", API)).toContain(
      'carmen-heading-2',
    );
  });

  it("renders a bullet list", () => {
    const out = formatCarmenMessage("- a\n- b", API);
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>a</li>");
    expect(out).toContain("<li>b</li>");
  });

  it("renders a numbered item", () => {
    expect(formatCarmenMessage("1. first", API)).toContain(
      "carmen-numbered-item",
    );
  });

  it("renders a horizontal rule", () => {
    expect(formatCarmenMessage("---", API)).toContain("carmen-hr");
  });

  it("escapes a literal '<' that is not an HTML tag", () => {
    const out = formatCarmenMessage("Amount < 100", API);
    expect(out).toContain("&lt;");
    expect(out).not.toContain("< 100<");
  });

  it("converts a YouTube link into an embedded iframe", () => {
    const out = formatCarmenMessage("[vid](https://youtu.be/abcdefghijk)", API);
    expect(out).toContain("<iframe");
    expect(out).toContain("youtube.com/embed/abcdefghijk");
  });

  it("converts an internal image into a lightbox img resolved via apiBase", () => {
    const out = formatCarmenMessage(
      "![alt](http://localhost:8080/x/y.png)",
      API,
    );
    expect(out).toContain("carmen-lightbox-img");
    expect(out).toContain("/images/x/y.png");
  });

  it("converts an external markdown link into a carmen-link anchor", () => {
    const out = formatCarmenMessage("[site](https://example.com)", API);
    expect(out).toContain("carmen-link");
    expect(out).toContain('target="_blank"');
    expect(out).toContain("example.com");
  });
});
```

- [ ] **Step 2: Run the test file**

Run: `cd frontend-next && bun test __tests__/carmen-formatter.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 3: Commit**

```bash
cd frontend-next && git add __tests__/carmen-formatter.test.ts
git commit -m "test(frontend): cover formatCarmenMessage output formatting"
```

---

### Task 4: `faq-nav` tests (Tier 2)

**Files:**
- Create: `frontend-next/__tests__/faq-nav.test.ts`

**Interfaces:**
- Consumes (existing exports from `@/lib/faq-nav`):
  - `faqSegmentLabel(seg: string): string`
  - `faqPathTail(path: string): string[] | null`
  - `faqIndexTitlesByFolderKey(items: FaqWikiItem[]): Map<string, string>`
  - `buildFaqNav(prefix: string[], items: FaqWikiItem[]): { folders: { slug: string; title: string }[]; articles: FaqWikiItem[] }`
  - type `FaqWikiItem` = `WikiListItem & { slug: string }` (`WikiListItem` requires `path: string`, `title: string`).
- Produces: a passing test file (no exports).

- [ ] **Step 1: Write the test file**

```ts
// frontend-next/__tests__/faq-nav.test.ts
import {
  faqSegmentLabel,
  faqPathTail,
  faqIndexTitlesByFolderKey,
  buildFaqNav,
  type FaqWikiItem,
} from "@/lib/faq-nav";

function item(path: string, slug: string, title = ""): FaqWikiItem {
  return { path, slug, title } as FaqWikiItem;
}

describe("faqSegmentLabel", () => {
  it("turns dashes and underscores into spaces", () => {
    expect(faqSegmentLabel("Procurement-Product")).toBe("Procurement Product");
    expect(faqSegmentLabel("a_b")).toBe("a b");
  });
});

describe("faqPathTail", () => {
  it("returns the segments under faq/", () => {
    expect(faqPathTail("faq/proc/x.md")).toEqual(["proc", "x.md"]);
  });

  it("returns null when the path is not under faq/", () => {
    expect(faqPathTail("other/x.md")).toBeNull();
  });

  it("normalizes backslashes", () => {
    expect(faqPathTail("faq\\proc\\x.md")).toEqual(["proc", "x.md"]);
  });
});

describe("faqIndexTitlesByFolderKey", () => {
  it("maps a folder key to the title from its index.md", () => {
    const map = faqIndexTitlesByFolderKey([
      item("faq/proc/index.md", "index", "Procurement"),
    ]);
    expect(map.get("proc")).toBe("Procurement");
  });
});

describe("buildFaqNav", () => {
  it("splits folders and articles at the prefix and uses index titles", () => {
    const items = [
      item("faq/proc/index.md", "index", "Procurement"),
      item("faq/proc/howto.md", "howto", "How To"),
      item("faq/intro.md", "intro", "Intro"),
    ];
    const nav = buildFaqNav([], items);

    expect(nav.folders.map((f) => f.slug)).toContain("proc");
    expect(nav.folders.find((f) => f.slug === "proc")?.title).toBe(
      "Procurement",
    );
    expect(nav.articles.map((a) => a.slug)).toContain("intro");
    expect(nav.articles.map((a) => a.slug)).not.toContain("howto");
  });
});
```

- [ ] **Step 2: Run the test file**

Run: `cd frontend-next && bun test __tests__/faq-nav.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 3: Commit**

```bash
cd frontend-next && git add __tests__/faq-nav.test.ts
git commit -m "test(frontend): cover faq-nav tree building"
```

---

### Task 5: `changelog-utils` tests (Tier 2)

**Files:**
- Create: `frontend-next/__tests__/changelog-utils.test.ts`

**Interfaces:**
- Consumes (existing exports from `@/lib/changelog-utils`):
  - `inferReleaseUtcFromSlug(slug: string): number | null`
  - `changelogItemTimestamp(item: ChangelogListEntry): number`
  - `sortChangelogItems(items: ChangelogListEntry[]): ChangelogListEntry[]`
  - `buildChangelogNavList(items): ChangelogListEntry[]`
  - type `ChangelogListEntry` = `WikiListItem & { slug: string }` (`WikiListItem` requires `path`, `title`; optional `date`, `publishedAt`, `dateCreated`).
- Produces: a passing test file (no exports).

- [ ] **Step 1: Write the test file**

```ts
// frontend-next/__tests__/changelog-utils.test.ts
import {
  inferReleaseUtcFromSlug,
  changelogItemTimestamp,
  sortChangelogItems,
  buildChangelogNavList,
  type ChangelogListEntry,
} from "@/lib/changelog-utils";

function entry(
  slug: string,
  path: string,
  extra: Partial<ChangelogListEntry> = {},
): ChangelogListEntry {
  return { slug, path, title: slug, ...extra } as ChangelogListEntry;
}

describe("inferReleaseUtcFromSlug", () => {
  it("parses a 3-letter month + year to UTC day 15", () => {
    expect(inferReleaseUtcFromSlug("jun2026")).toBe(Date.UTC(2026, 5, 15));
  });

  it("parses a full month name", () => {
    expect(inferReleaseUtcFromSlug("june2026")).toBe(Date.UTC(2026, 5, 15));
  });

  it("ignores underscores", () => {
    expect(inferReleaseUtcFromSlug("jan_2026")).toBe(Date.UTC(2026, 0, 15));
  });

  it("returns null for an unrecognized slug", () => {
    expect(inferReleaseUtcFromSlug("notamonth2026")).toBeNull();
    expect(inferReleaseUtcFromSlug("2026")).toBeNull();
  });
});

describe("changelogItemTimestamp", () => {
  it("prefers the slug-derived date", () => {
    expect(changelogItemTimestamp(entry("jun2026", "changelog/jun2026.md"))).toBe(
      Date.UTC(2026, 5, 15),
    );
  });

  it("falls back to the date field when the slug has no month", () => {
    const t = changelogItemTimestamp(
      entry("release", "changelog/release.md", { date: "2026-03-01" }),
    );
    expect(t).toBe(Date.parse("2026-03-01"));
  });

  it("returns 0 when there is no slug date and no date fields", () => {
    expect(
      changelogItemTimestamp(entry("release", "changelog/release.md")),
    ).toBe(0);
  });
});

describe("sortChangelogItems", () => {
  it("sorts newest first", () => {
    const sorted = sortChangelogItems([
      entry("jan2026", "changelog/jan2026.md"),
      entry("jun2026", "changelog/jun2026.md"),
    ]);
    expect(sorted.map((e) => e.slug)).toEqual(["jun2026", "jan2026"]);
  });
});

describe("buildChangelogNavList", () => {
  it("drops index and _images entries and sorts newest first", () => {
    const list = buildChangelogNavList([
      entry("index", "changelog/index.md"),
      entry("img", "changelog/_images/pic.md"),
      entry("jan2026", "changelog/jan2026.md"),
      entry("jun2026", "changelog/jun2026.md"),
    ]);
    expect(list.map((e) => e.slug)).toEqual(["jun2026", "jan2026"]);
  });

  it("tolerates null/undefined input", () => {
    expect(buildChangelogNavList(null)).toEqual([]);
    expect(buildChangelogNavList(undefined)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test file**

Run: `cd frontend-next && bun test __tests__/changelog-utils.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 3: Commit**

```bash
cd frontend-next && git add __tests__/changelog-utils.test.ts
git commit -m "test(frontend): cover changelog-utils parsing/sorting"
```

---

### Task 6: `wiki-utils` tests (Tier 2)

**Files:**
- Create: `frontend-next/__tests__/wiki-utils.test.ts`

**Interfaces:**
- Consumes (existing exports from `@/lib/wiki-utils`):
  - `formatCategoryName(slug: string): string`
  - `humanizeWikiStem(stem: string): string`
  - `displayWikiArticleTitle(title: string | undefined, slug: string, path: string): string`
- Depends on `@/configs/sidebar-map`'s `categoryDisplayMap`, which maps `gl` → `"General Ledger"` (used as the known-hit fixture).
- Produces: a passing test file (no exports).

- [ ] **Step 1: Write the test file**

```ts
// frontend-next/__tests__/wiki-utils.test.ts
import {
  formatCategoryName,
  humanizeWikiStem,
  displayWikiArticleTitle,
} from "@/lib/wiki-utils";

describe("formatCategoryName", () => {
  it("returns the mapped display name for a known slug", () => {
    expect(formatCategoryName("gl")).toBe("General Ledger");
  });

  it("uppercases an unknown slug", () => {
    expect(formatCategoryName("zzz")).toBe("ZZZ");
  });

  it("returns empty string for empty input", () => {
    expect(formatCategoryName("")).toBe("");
  });
});

describe("humanizeWikiStem", () => {
  it("strips .md and turns separators into spaces", () => {
    expect(humanizeWikiStem("getting-started.md")).toBe("getting started");
  });

  it("preserves original casing (no title-casing)", () => {
    expect(humanizeWikiStem("AP_invoice")).toBe("AP invoice");
  });
});

describe("displayWikiArticleTitle", () => {
  it("uses the humanized stem when the title equals the stem", () => {
    expect(displayWikiArticleTitle("invoice", "invoice", "ap/invoice.md")).toBe(
      "invoice",
    );
  });

  it("returns a meaningful title unchanged", () => {
    expect(
      displayWikiArticleTitle("Invoice Guide", "invoice", "ap/invoice.md"),
    ).toBe("Invoice Guide");
  });

  it("drops a long error-looking title in favor of the humanized stem", () => {
    const longError =
      "Error: failed to load the requested document file and parse it";
    expect(
      displayWikiArticleTitle(longError, "invoice", "ap/invoice.md"),
    ).toBe("invoice");
  });
});
```

- [ ] **Step 2: Run the test file**

Run: `cd frontend-next && bun test __tests__/wiki-utils.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 3: Commit**

```bash
cd frontend-next && git add __tests__/wiki-utils.test.ts
git commit -m "test(frontend): cover wiki-utils title/category helpers"
```

---

### Task 7 (optional, Tier 3): `locale` + `carmen-client-id` tests

**Files:**
- Create: `frontend-next/__tests__/locale.test.ts`
- Create: `frontend-next/__tests__/carmen-client-id.test.ts`

**Interfaces:**
- Consumes:
  - `@/lib/locale`: `setLocaleCookie(locale: string): void`, `getLocaleFromClient(): string` (cookie `NEXT_LOCALE`, default `"th"`).
  - `@/lib/carmen-client-id`: `getOrCreateClientId(): string` (localStorage key `carmen_client_id`, value prefixed `anon_`).
- Uses happy-dom globals `document.cookie` and `localStorage` (provided by `test-setup.ts`); clears them in `beforeEach`.
- Produces: two passing test files (no exports).

- [ ] **Step 1: Write `locale.test.ts`**

```ts
// frontend-next/__tests__/locale.test.ts
import { beforeEach } from "bun:test";
import { setLocaleCookie, getLocaleFromClient } from "@/lib/locale";

beforeEach(() => {
  // Clear the NEXT_LOCALE cookie before each test.
  document.cookie = "NEXT_LOCALE=; path=/; max-age=0";
});

describe("locale cookie", () => {
  it("defaults to 'th' when no cookie is set", () => {
    expect(getLocaleFromClient()).toBe("th");
  });

  it("round-trips a locale set via setLocaleCookie", () => {
    setLocaleCookie("en");
    expect(getLocaleFromClient()).toBe("en");
  });
});
```

- [ ] **Step 2: Run it**

Run: `cd frontend-next && bun test __tests__/locale.test.ts`
Expected: PASS.

- [ ] **Step 3: Write `carmen-client-id.test.ts`**

```ts
// frontend-next/__tests__/carmen-client-id.test.ts
import { beforeEach } from "bun:test";
import { getOrCreateClientId } from "@/lib/carmen-client-id";

beforeEach(() => {
  localStorage.clear();
});

describe("getOrCreateClientId", () => {
  it("creates an anon_ id and persists it to localStorage", () => {
    const id = getOrCreateClientId();
    expect(id.startsWith("anon_")).toBe(true);
    expect(localStorage.getItem("carmen_client_id")).toBe(id);
  });

  it("returns the same id on subsequent calls", () => {
    const first = getOrCreateClientId();
    const second = getOrCreateClientId();
    expect(second).toBe(first);
  });
});
```

- [ ] **Step 4: Run it**

Run: `cd frontend-next && bun test __tests__/carmen-client-id.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend-next && git add __tests__/locale.test.ts __tests__/carmen-client-id.test.ts
git commit -m "test(frontend): cover locale cookie + carmen client id helpers"
```

---

### Task 8: Full-suite regression check

**Files:** none (verification only).

- [ ] **Step 1: Run the entire frontend test suite**

Run: `cd frontend-next && bun test`
Expected: PASS — all new test files AND the 5 pre-existing files
(`ssrf-guard`, `url-safety`, `export-images`, `dompurify-security`,
`wiki-route-security`) are green. If any pre-existing test regressed, a mock
(global `fetch`) or cookie/localStorage state leaked — fix the offending
`afterEach`/`beforeEach` cleanup in the new test file, do not touch `lib/`.

- [ ] **Step 2: Lint the new tests**

Run: `cd frontend-next && npm run lint`
Expected: no new lint errors in `__tests__/`.

- [ ] **Step 3: Final commit (only if Step 2 required fixes)**

```bash
cd frontend-next && git add __tests__/
git commit -m "test(frontend): lint fixes for unit test suite"
```

---

## Notes for the implementer

- Tasks 1–6 are mandatory (Tier 1 + Tier 2). Task 7 is optional (Tier 3) — do it if Tasks 1–6 went smoothly. Task 8 is the final gate and is mandatory.
- Each task is independent and can be implemented/reviewed on its own; order is a suggestion, not a hard dependency.
- Remember the failure rule: a failing test that exposes a real `lib/` bug is a STOP-and-ask, not a source edit.
