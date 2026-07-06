# Design: Frontend → Supabase connectivity test (`chat_history` count)

**Date:** 2026-07-06
**Status:** Approved (pending spec review)
**Route:** `/history/count`

## 1. Goal

A small proof-of-concept page in `frontend-next` with a button that makes the
**browser call Supabase directly** (`https://bqlgmrcvfdisufiiwzyv.supabase.co`)
and returns the row count of `public.chat_history`. Purpose is to verify that a
direct frontend → Supabase connection works — it deliberately does **not** go
through the Go backend.

This breaks the usual "frontend talks only to the Go backend" convention on
purpose: proving the direct path is the whole point of the test.

Non-goals (YAGNI): no per-BU filtering, no auth gating, no listing/reading of
chat rows, no dashboard, no charts.

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
```

- `chat_history` RLS stays locked — `anon` cannot `SELECT` rows, only `EXECUTE`
  the function, which returns a single `bigint`.
- Delivered as a new migration file
  `backend/migrations/0002_chat_history_count_rpc.sql`.
- Applied with `psql` / the Supabase SQL editor (per repo convention — the Go
  migrate splits on `;` and is unsafe for functions). Idempotent
  (`create or replace`), safe to re-run.

## 3. Frontend side

### 3.1 Environment variables (new)

| Var | Where | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel env | `https://bqlgmrcvfdisufiiwzyv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel env | the project's `anon public` key (from Supabase → Project Settings → API) |

Both are `NEXT_PUBLIC_*` (safe to ship in the browser bundle). The **anon** key
only — never the `service_role` key.

### 3.2 `lib/supabase-check.ts` — fetch helper

A ~10-line helper, no new dependency (plain `fetch`, no `@supabase/supabase-js`):

```
POST {NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_chat_history_count
headers:
  apikey: {anon}
  Authorization: Bearer {anon}
  Content-Type: application/json
body: {}
```

- PostgREST returns the scalar `bigint` as a JSON number.
- Returns `Promise<number>`; throws a typed error on failure (see §5).
- Reads env at call time; if either var is missing, throws a clear
  "env not configured" error rather than firing a broken request.

### 3.3 `app/history/count/page.tsx` — test page

- Client component (`"use client"`) — the browser must be the one calling
  Supabase (a server component would make the Next.js server call it instead,
  defeating the test).
- A button "ทดสอบการเชื่อมต่อ" and a result area with three states:
  - **idle** — button only
  - **loading** — disabled button + spinner/"กำลังเชื่อมต่อ…"
  - **result** — either `chat_history มี N แถว` or a readable error message

## 4. Data flow

```
[button /history/count] --click-->
  lib/supabase-check.ts
    --fetch POST /rest/v1/rpc/get_chat_history_count (anon key)-->
      Supabase PostgREST
        --> get_chat_history_count()  [SECURITY DEFINER, counts all rows]
    <-- JSON number (count) <--
  page renders "chat_history มี N แถว"
```

## 5. Error handling

The helper distinguishes and surfaces each failure so the tester can diagnose:

- **Env not set** — `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` missing → explicit
  message, no request fired.
- **Network failure** — `fetch` rejects → "เชื่อมต่อ Supabase ไม่ได้ (network)".
- **HTTP error** — non-2xx → show `status` + response body text (e.g. 401 bad
  key, 404 function not found / not granted to anon).
- **Parse failure** — body is not a number → "รูปแบบผลลัพธ์ไม่ถูกต้อง".

The page catches all of the above and renders them; it never crashes.

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

- The project's Supabase **anon public** key must be available to set
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dev `.env.local` and Vercel env). Needed
  before the page can succeed.
- The `0002_chat_history_count_rpc.sql` migration must be applied to the
  Supabase DB before the button will return a count (otherwise HTTP 404 from
  PostgREST).

## 8. Testing

- **Manual (primary):** run `frontend-next` dev, open `/history/count`, click
  the button, confirm a numeric count renders. Cross-check the number against
  `SELECT count(*) FROM public.chat_history;` run directly on Supabase.
- **Unit (helper):** test `lib/supabase-check.ts` with a mocked `fetch` for the
  success path and each error branch in §5 (env-missing, network, HTTP error,
  parse error). Uses the existing `bun test` setup.

## 9. Files touched

| File | Change |
| --- | --- |
| `backend/migrations/0002_chat_history_count_rpc.sql` | new — the RPC + grant |
| `frontend-next/lib/supabase-check.ts` | new — fetch helper |
| `frontend-next/app/history/count/page.tsx` | new — client test page |
| `frontend-next/.env.local` | add the two `NEXT_PUBLIC_SUPABASE_*` vars |
| `frontend-next/__tests__/supabase-check.test.ts` | new — helper unit tests |
| Vercel project env | add the two `NEXT_PUBLIC_SUPABASE_*` vars (deploy) |
