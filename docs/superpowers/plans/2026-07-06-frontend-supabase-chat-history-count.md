# Frontend → Supabase `chat_history` count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/history/count` route in `frontend-react` that, on page load, calls Supabase directly from the browser and shows the row count of `public.chat_history`.

**Architecture:** A Postgres `SECURITY DEFINER` RPC `public.get_chat_history_count()` (granted to `anon`) returns only the count while `chat_history` keeps RLS locked. The browser POSTs to the Supabase PostgREST `/rest/v1/rpc/get_chat_history_count` endpoint with the anon key (plain `fetch`, no new dependency). A React Router 7 route component auto-fetches on mount and renders loading/success/error states.

**Tech Stack:** Postgres/Supabase (PostgREST), Vite + React 19 + React Router 7 (`frontend-react`), `bun test` + `@testing-library/react`, Tailwind + shadcn UI (`Card`, `Spinner`).

## Global Constraints

- **Target frontend is `frontend-react`** (Vite + React Router 7) — NOT `frontend-next`. All frontend paths below are under `frontend-react/`.
- **Env prefix is `VITE_`** and is read via `import.meta.env.VITE_...`. Exact var names: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Supabase project URL:** `https://bqlgmrcvfdisufiiwzyv.supabase.co`.
- **anon key only** in any frontend file/env — never the `service_role` key.
- **No new npm dependency** — use the built-in `fetch` (no `@supabase/supabase-js`).
- **Tests:** `bun test` from `frontend-react/`; test files are colocated (`*.test.ts`/`*.test.tsx`). Assign `globalThis.fetch = mock(...)` and restore in `afterEach`. Mutate env via `(import.meta as unknown as { env: Record<string, unknown> }).env`. Mock local modules with `mock.module("@/lib/...", () => ({...}))` **before** `await import(...)` of the module under test.
- **Route path style:** children paths in `src/router.tsx` have no leading slash (e.g. `admin/activity`), so use `history/count`.
- **Migrations** are applied with `psql`/Supabase SQL editor, never `./server migrate` (it splits on `;` and breaks functions).

---

### Task 1: Supabase count-only RPC migration

**Files:**
- Create: `backend/migrations/0002_chat_history_count_rpc.sql`

**Interfaces:**
- Produces: PostgREST endpoint `POST /rest/v1/rpc/get_chat_history_count` returning a `bigint` scalar, callable by the `anon` role. Consumed by Task 3's helper.

- [ ] **Step 1: Write the migration SQL**

Create `backend/migrations/0002_chat_history_count_rpc.sql`:

```sql
-- 0002_chat_history_count_rpc.sql
-- Count-only RPC for the frontend Supabase connectivity test (/history/count).
-- SECURITY DEFINER so the anon role can read ONLY the row count of
-- public.chat_history without any SELECT access to the (RLS-locked) table rows.
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION public.get_chat_history_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT count(*) FROM public.chat_history $$;

-- Lock down, then grant EXECUTE only to the anonymous API role.
REVOKE ALL ON FUNCTION public.get_chat_history_count() FROM public;
GRANT EXECUTE ON FUNCTION public.get_chat_history_count() TO anon;

-- Ask PostgREST to reload its schema cache so the function is exposed immediately.
NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Apply the migration to the Supabase DB**

Apply via the Supabase SQL editor (paste the file contents and Run), **or** with `psql` against the Supabase session pooler:

```bash
psql "$SUPABASE_DB_URL" -f backend/migrations/0002_chat_history_count_rpc.sql
```

Expected: `CREATE FUNCTION` / `REVOKE` / `GRANT` / `NOTIFY` all succeed with no error.

(`SUPABASE_DB_URL` is the project's Postgres connection string — session pooler host `aws-1-ap-southeast-1:5432`, per the Supabase migration notes. Requires DB credentials.)

- [ ] **Step 3: Verify the RPC is callable with the anon key**

Run (replace `<ANON_KEY>` with the project's `anon public` key from Supabase → Project Settings → API):

```bash
curl -sS -X POST \
  "https://bqlgmrcvfdisufiiwzyv.supabase.co/rest/v1/rpc/get_chat_history_count" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: a bare integer, e.g. `1234` (no error object). If you get `{"code":"PGRST202",...}` the schema cache has not reloaded yet — wait a few seconds and retry, or re-run the `NOTIFY` line.

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/0002_chat_history_count_rpc.sql
git commit -m "feat(migration): count-only RPC get_chat_history_count for /history/count"
```

---

### Task 2: `supabase-check` fetch helper

**Files:**
- Create: `frontend-react/src/lib/supabase-check.ts`
- Test: `frontend-react/src/lib/supabase-check.test.ts`
- Modify: `frontend-react/src/vite-env.d.ts`

**Interfaces:**
- Consumes: Task 1's `POST /rest/v1/rpc/get_chat_history_count` endpoint; env `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Produces:
  - `fetchChatHistoryCount(): Promise<number>` — resolves to the row count.
  - `class SupabaseCheckError extends Error` with `readonly kind: "env" | "network" | "http" | "parse"` and `readonly status?: number`.
  - `type SupabaseCheckErrorKind = "env" | "network" | "http" | "parse"`.

- [ ] **Step 1: Declare the new env vars in the Vite env typings**

In `frontend-react/src/vite-env.d.ts`, extend the existing `ImportMetaEnv` interface (it currently declares `VITE_API_BASE?` and `VITE_USE_REMOTE_API?`):

```ts
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_USE_REMOTE_API?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
```

- [ ] **Step 2: Write the failing helper tests**

Create `frontend-react/src/lib/supabase-check.test.ts`:

```ts
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { fetchChatHistoryCount, SupabaseCheckError } from "./supabase-check";

const metaEnv = (import.meta as unknown as { env: Record<string, unknown> }).env;
const realFetch = globalThis.fetch;

const URL_VAL = "https://example.supabase.co";
const KEY_VAL = "anon-test-key";

beforeEach(() => {
  metaEnv.VITE_SUPABASE_URL = URL_VAL;
  metaEnv.VITE_SUPABASE_ANON_KEY = KEY_VAL;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete metaEnv.VITE_SUPABASE_URL;
  delete metaEnv.VITE_SUPABASE_ANON_KEY;
});

describe("fetchChatHistoryCount", () => {
  it("returns the count and calls the RPC endpoint with the anon key", async () => {
    let calledUrl = "";
    let calledInit: RequestInit | undefined;
    globalThis.fetch = mock((input: unknown, init?: RequestInit) => {
      calledUrl = String(input);
      calledInit = init;
      return Promise.resolve(new Response("1234", { status: 200 }));
    }) as unknown as typeof fetch;

    const count = await fetchChatHistoryCount();

    expect(count).toBe(1234);
    expect(calledUrl).toBe(
      "https://example.supabase.co/rest/v1/rpc/get_chat_history_count",
    );
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers.apikey).toBe(KEY_VAL);
    expect(headers.Authorization).toBe(`Bearer ${KEY_VAL}`);
    expect(calledInit?.method).toBe("POST");
  });

  it("parses a bigint returned as a quoted string", async () => {
    globalThis.fetch = mock(async () =>
      new Response('"4096"', { status: 200 }),
    ) as unknown as typeof fetch;
    expect(await fetchChatHistoryCount()).toBe(4096);
  });

  it("throws an env error and does not fetch when config is missing", async () => {
    delete metaEnv.VITE_SUPABASE_URL;
    delete metaEnv.VITE_SUPABASE_ANON_KEY;
    let called = false;
    globalThis.fetch = mock(async () => {
      called = true;
      return new Response("1");
    }) as unknown as typeof fetch;

    const err = (await fetchChatHistoryCount().catch((e) => e)) as SupabaseCheckError;
    expect(err).toBeInstanceOf(SupabaseCheckError);
    expect(err.kind).toBe("env");
    expect(called).toBe(false);
  });

  it("throws a network error when fetch rejects", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new TypeError("failed")),
    ) as unknown as typeof fetch;
    const err = (await fetchChatHistoryCount().catch((e) => e)) as SupabaseCheckError;
    expect(err.kind).toBe("network");
  });

  it("throws an http error carrying the status", async () => {
    globalThis.fetch = mock(async () =>
      new Response("no key", { status: 401 }),
    ) as unknown as typeof fetch;
    const err = (await fetchChatHistoryCount().catch((e) => e)) as SupabaseCheckError;
    expect(err).toBeInstanceOf(SupabaseCheckError);
    expect(err.kind).toBe("http");
    expect(err.status).toBe(401);
  });

  it("throws a parse error when the body is not a number", async () => {
    globalThis.fetch = mock(async () =>
      new Response("not-json", { status: 200 }),
    ) as unknown as typeof fetch;
    const err = (await fetchChatHistoryCount().catch((e) => e)) as SupabaseCheckError;
    expect(err.kind).toBe("parse");
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd frontend-react && bun test src/lib/supabase-check.test.ts`
Expected: FAIL — cannot resolve `./supabase-check` (module does not exist yet).

- [ ] **Step 4: Write the helper implementation**

Create `frontend-react/src/lib/supabase-check.ts`:

```ts
export type SupabaseCheckErrorKind = "env" | "network" | "http" | "parse";

/** Typed failure for the Supabase connectivity test. */
export class SupabaseCheckError extends Error {
  readonly kind: SupabaseCheckErrorKind;
  readonly status?: number;

  constructor(message: string, kind: SupabaseCheckErrorKind, status?: number) {
    super(message);
    this.name = "SupabaseCheckError";
    this.kind = kind;
    this.status = status;
  }
}

/**
 * Calls the Supabase count-only RPC directly from the browser and returns the
 * number of rows in public.chat_history. Env is read at call time (not module
 * load) so the function stays unit-testable.
 */
export async function fetchChatHistoryCount(): Promise<number> {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new SupabaseCheckError(
      "ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY",
      "env",
    );
  }

  const endpoint = `${url.replace(/\/+$/, "")}/rest/v1/rpc/get_chat_history_count`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  } catch {
    throw new SupabaseCheckError("เชื่อมต่อ Supabase ไม่ได้ (network)", "network");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SupabaseCheckError(
      `Supabase ตอบกลับ HTTP ${res.status}${body ? `: ${body}` : ""}`,
      "http",
      res.status,
    );
  }

  const raw = await res.text();
  let value: number;
  try {
    value = Number(JSON.parse(raw));
  } catch {
    throw new SupabaseCheckError("รูปแบบผลลัพธ์จาก Supabase ไม่ถูกต้อง", "parse");
  }
  if (!Number.isFinite(value)) {
    throw new SupabaseCheckError("รูปแบบผลลัพธ์จาก Supabase ไม่ถูกต้อง", "parse");
  }
  return value;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend-react && bun test src/lib/supabase-check.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/lib/supabase-check.ts \
        frontend-react/src/lib/supabase-check.test.ts \
        frontend-react/src/vite-env.d.ts
git commit -m "feat(frontend): add supabase-check helper for chat_history count"
```

---

### Task 3: `/history/count` route (auto-loads on mount)

**Files:**
- Create: `frontend-react/src/routes/history-count.tsx`
- Test: `frontend-react/src/routes/history-count.test.tsx`
- Modify: `frontend-react/src/router.tsx`
- Modify: `frontend-react/.env.example`
- Modify: `frontend-react/.env` (gitignored — real values, not committed)

**Interfaces:**
- Consumes: `fetchChatHistoryCount` and `SupabaseCheckError` from `@/lib/supabase-check` (Task 2).
- Produces: default-exported `HistoryCount` route component, registered at path `history/count`.

- [ ] **Step 1: Write the failing route render test**

Create `frontend-react/src/routes/history-count.test.tsx`:

```tsx
import { describe, it, expect, mock, jest, beforeEach } from "bun:test";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

const fetchChatHistoryCount = jest.fn();
mock.module("@/lib/supabase-check", () => ({
  fetchChatHistoryCount,
  SupabaseCheckError: class SupabaseCheckError extends Error {},
}));

const { default: HistoryCount } = await import("./history-count");

function renderPage() {
  const r = createMemoryRouter(
    [{ path: "/history/count", element: <HistoryCount /> }],
    { initialEntries: ["/history/count"] },
  );
  render(<RouterProvider router={r} />);
}

describe("history/count route", () => {
  beforeEach(() => {
    fetchChatHistoryCount.mockReset();
  });

  it("auto-loads and shows the count on mount (no interaction)", async () => {
    fetchChatHistoryCount.mockResolvedValue(1234);
    renderPage();
    expect(await screen.findByText(/1234/)).toBeInTheDocument();
    expect(fetchChatHistoryCount).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when the fetch fails", async () => {
    fetchChatHistoryCount.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByText(/ผิดพลาด/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend-react && bun test src/routes/history-count.test.tsx`
Expected: FAIL — cannot resolve `./history-count` (component does not exist yet).

- [ ] **Step 3: Write the route component**

Create `frontend-react/src/routes/history-count.tsx`:

```tsx
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { fetchChatHistoryCount, SupabaseCheckError } from "@/lib/supabase-check";

type State =
  | { status: "loading" }
  | { status: "success"; count: number }
  | { status: "error"; message: string };

export default function HistoryCount() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetchChatHistoryCount()
      .then((count) => {
        if (active) setState({ status: "success", count });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message =
          err instanceof SupabaseCheckError
            ? err.message
            : "เกิดข้อผิดพลาดที่ไม่รู้จักในการเชื่อมต่อ Supabase";
        setState({ status: "error", message });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Supabase connectivity test</CardTitle>
          <CardDescription>
            จำนวนแถวใน public.chat_history (ยิงตรงจาก browser ไป Supabase)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.status === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner /> กำลังเชื่อมต่อ Supabase…
            </div>
          )}
          {state.status === "success" && (
            <p className="text-lg">
              chat_history มี{" "}
              <span className="font-semibold tabular-nums">{state.count}</span>{" "}
              แถว
            </p>
          )}
          {state.status === "error" && (
            <p className="text-destructive">เกิดข้อผิดพลาด: {state.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Register the route in `src/router.tsx`**

Add the import alongside the other route imports (after the `Chat` import, before `NotFound`):

```tsx
import HistoryCount from "@/routes/history-count";
```

Add the route object inside the `children` array, right after the `chat` route (`{ path: "chat", element: <Chat /> },`) and before the catch-all `{ path: "*", element: <NotFound /> }`:

```tsx
      { path: "history/count", element: <HistoryCount /> },
```

- [ ] **Step 5: Run the route + router tests to verify they pass**

Run: `cd frontend-react && bun test src/routes/history-count.test.tsx src/router.test.tsx`
Expected: PASS — the 2 new route tests and the existing router tests are all green.

- [ ] **Step 6: Add the env vars**

Append to `frontend-react/.env.example` (committed — placeholder key):

```
# Supabase — direct browser connectivity test (/history/count)
VITE_SUPABASE_URL=https://bqlgmrcvfdisufiiwzyv.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Append to `frontend-react/.env` (gitignored — put the REAL anon public key from Supabase → Project Settings → API):

```
VITE_SUPABASE_URL=https://bqlgmrcvfdisufiiwzyv.supabase.co
VITE_SUPABASE_ANON_KEY=<real anon public key>
```

- [ ] **Step 7: Manual verification in the dev server**

Run: `cd frontend-react && bun run dev` then open `http://localhost:3302/history/count`.
Expected: the page loads and — with no clicks — shows a spinner briefly, then "chat_history มี N แถว". Cross-check N against `SELECT count(*) FROM public.chat_history;` on Supabase. (If the anon key/migration is not in place yet, you should instead see a readable error message, not a blank/crashed page.)

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/routes/history-count.tsx \
        frontend-react/src/routes/history-count.test.tsx \
        frontend-react/src/router.tsx \
        frontend-react/.env.example
git commit -m "feat(frontend): /history/count route auto-loading chat_history count from Supabase"
```

(Note: `frontend-react/.env` is gitignored and intentionally not committed. Also set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in the Vercel project env for the deployed build.)

---

## Self-Review

**Spec coverage:**
- §2 count-only RPC → Task 1. ✅
- §3.1 env vars + `vite-env.d.ts` → Task 2 Step 1, Task 3 Step 6. ✅
- §3.2 fetch helper + `SupabaseCheckError` kinds → Task 2. ✅
- §3.3 auto-loading route + router registration → Task 3. ✅
- §4 data flow (mount → fetch → render) → Task 3 component. ✅
- §5 error handling (env/network/http/parse) → Task 2 helper + tests. ✅
- §6 security (anon-only, RPC not table SELECT, all-BU count) → Task 1 SQL + §Global Constraints. ✅
- §8 testing (helper unit + route render + manual) → Task 2 Step 2/5, Task 3 Step 1/5/7. ✅
- §9 files → all listed files appear across Tasks 1–3. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows complete code; every command shows expected output. The only intentional user-supplied values are `<ANON_KEY>` / `<real anon public key>` (a genuine secret the engineer must provide) and `SUPABASE_DB_URL` (existing DB credential). ✅

**Type consistency:** `fetchChatHistoryCount(): Promise<number>` and `SupabaseCheckError { kind, status? }` are defined identically in Task 2's Produces block, the helper implementation, and consumed unchanged in Task 3. Env var names `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and endpoint path `/rest/v1/rpc/get_chat_history_count` are identical across Tasks 1–3. ✅
