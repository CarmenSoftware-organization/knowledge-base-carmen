# Design: Frontend → Supabase connectivity test (`chat_history` count)

**Date:** 2026-07-06
**Status:** Approved (pending spec review)
**Route:** `/history/count`
**Target frontend:** `frontend-react` (Vite + React Router 7) — the active/deployed
frontend, **not** `frontend-next`.

## 1. Goal

A small proof-of-concept route in `frontend-react` that, **on page load
(no button)**, makes the **browser call Supabase directly**
(`https://bqlgmrcvfdisufiiwzyv.supabase.co`) and displays the row count of
`public.chat_history`. Purpose is to verify a direct frontend → Supabase
connection works — it deliberately does **not** go through the Go backend.

This breaks the usual "frontend talks only to the Go backend" convention on
purpose: proving the direct path is the whole point of the test.

Non-goals (YAGNI): no per-BU filtering, no auth gating, no listing/reading of
chat rows, no dashboard, no charts, no manual refresh button.

## 2. Supabase side — count-only RPC

Expose **only a count**, never the sensitive Q&A rows, to the anonymous browser
client. A `SECURITY DEFINER` function does the `count(*)` server-side while the
`chat_history` table itself keeps RLS locked.

```sql
create or replace function public.get_chat_history_count()
returns bigint
language sql
security definer
set search_path = public
as $$ select count(*) from public.chat_history $$;

revoke all on function public.get_chat_history_count() from public;
grant execute on function public.get_chat_history_count() to anon;

notify pgrst, 'reload schema';
```

- `chat_history` RLS stays locked — `anon` cannot `SELECT` rows, only `EXECUTE`
  the function, which returns a single `bigint`.
- Delivered as a new migration file
  `backend/migrations/0002_chat_history_count_rpc.sql`.
- Applied with `psql` / the Supabase SQL editor (per repo convention — the Go
  migrate splits on `;` and is unsafe for functions). Idempotent
  (`create or replace`), safe to re-run.

## 3. Frontend side (`frontend-react`)

### 3.1 Environment variables (new — Vite `VITE_` prefix)

| Var | Where | Value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env` (gitignored) + `.env.example` + Vercel env | `https://bqlgmrcvfdisufiiwzyv.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `.env` (gitignored) + Vercel env; placeholder in `.env.example` | the project's `anon public` key (from Supabase → Project Settings → API) |

Both are `VITE_*` (exposed to the browser bundle by Vite). The **anon** key only
— never the `service_role` key. `.env` is gitignored, so the real key is not
committed; the anon key is public-by-design anyway (it ships in the bundle).
The two keys are also declared in `src/vite-env.d.ts` (`interface ImportMetaEnv`).

### 3.2 `src/lib/supabase-check.ts` — fetch helper

A small helper, no new dependency (plain `fetch`, no `@supabase/supabase-js`).
Reads `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
**at call time** (not module load) so it stays unit-testable.

```
POST {VITE_SUPABASE_URL}/rest/v1/rpc/get_chat_history_count
headers:
  apikey: {anon}
  Authorization: Bearer {anon}
  Content-Type: application/json
body: {}
```

- PostgREST returns the scalar `bigint`; parsed via `Number(JSON.parse(body))`
  so both a bare number (`1234`) and a quoted bigint (`"1234"`) work.
- Exports `fetchChatHistoryCount(): Promise<number>` and a typed
  `SupabaseCheckError` with a `kind: "env" | "network" | "http" | "parse"`
  (and `status?` for http).

### 3.3 `src/routes/history-count.tsx` — route component

- Default-exported route component (matches the `frontend-react` route pattern).
- **Auto-fetches on mount** via `useEffect` (no button). Local state machine:
  - **loading** — spinner + "กำลังเชื่อมต่อ Supabase…" (initial state)
  - **success** — "chat_history มี N แถว"
  - **error** — readable error message (from `SupabaseCheckError.message`, or a
    generic fallback)
- Registered in `src/router.tsx` as `{ path: "history/count", element: <HistoryCount /> }`
  under the existing `RootLayout` children.

## 4. Data flow

```
navigate to /history/count
  --> <HistoryCount/> mounts, useEffect fires (state: loading)
    --> src/lib/supabase-check.ts
      --fetch POST /rest/v1/rpc/get_chat_history_count (anon key)-->
        Supabase PostgREST
          --> get_chat_history_count()  [SECURITY DEFINER, counts all rows]
      <-- JSON number (count) <--
  --> setState(success) --> renders "chat_history มี N แถว"
```

## 5. Error handling

The helper distinguishes and surfaces each failure so the tester can diagnose:

- **Env not set** — `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing →
  `kind: "env"`, no request fired.
- **Network failure** — `fetch` rejects → `kind: "network"`.
- **HTTP error** — non-2xx → `kind: "http"`, carries `status` + response body
  text (e.g. 401 bad key, 404 function not found / not granted to anon).
- **Parse failure** — body not a finite number → `kind: "parse"`.

The route catches all of the above and renders the message; it never crashes.

## 6. Security

- **anon key only**, shipped in the bundle (public by design). The
  `service_role` key must never appear in frontend code or env.
- Access is via the count-only RPC, so no `anon` `SELECT` policy is opened on
  the sensitive `chat_history` table — the browser can obtain the count but not
  a single row of user Q&A.
- Count covers **all rows across all BUs** (no `bu_id` filter). Acceptable
  because a total row count leaks no per-tenant content. A `bu_id` parameter can
  be added later if needed.

## 7. Prerequisites

- The project's Supabase **anon public** key, to set `VITE_SUPABASE_ANON_KEY`
  (dev `.env` and Vercel env). Until set, the route renders the `env` error.
- The `0002_chat_history_count_rpc.sql` migration must be applied to the
  Supabase DB before the route returns a count (otherwise HTTP 404 from
  PostgREST → `http` error shown).

## 8. Testing

`frontend-react` has `@testing-library/react` + `user-event`, so both the helper
and the route are unit-testable under `bun test`.

- **Helper unit tests** (`src/lib/supabase-check.test.ts`): mocked `globalThis.fetch`
  + mutated `import.meta.env` — cover success (incl. quoted-bigint), env-missing
  (no fetch fired), network, http-with-status, parse.
- **Route render test** (`src/routes/history-count.test.tsx`): `mock.module` the
  helper, render via `createMemoryRouter` — assert the count renders on mount
  (auto-load) and that an error state renders on rejection.
- **Manual (primary):** run `frontend-react` dev (`bun run dev`, port 3302),
  open `/history/count`, confirm a numeric count renders without interaction.
  Cross-check against `SELECT count(*) FROM public.chat_history;` on Supabase.

## 9. Files touched

| File | Change |
| --- | --- |
| `backend/migrations/0002_chat_history_count_rpc.sql` | new — the RPC + grant + notify |
| `frontend-react/src/vite-env.d.ts` | modify — declare `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` |
| `frontend-react/.env.example` | modify — add the two vars (placeholder key) |
| `frontend-react/.env` | modify — add the two vars (real values; gitignored) |
| `frontend-react/src/lib/supabase-check.ts` | new — fetch helper |
| `frontend-react/src/lib/supabase-check.test.ts` | new — helper unit tests |
| `frontend-react/src/routes/history-count.tsx` | new — auto-loading route component |
| `frontend-react/src/routes/history-count.test.tsx` | new — route render test |
| `frontend-react/src/router.tsx` | modify — register `history/count` route |
| Vercel project env | add the two `VITE_SUPABASE_*` vars (deploy) |
