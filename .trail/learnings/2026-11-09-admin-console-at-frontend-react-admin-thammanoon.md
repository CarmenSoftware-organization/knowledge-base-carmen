---
title: Admin console at frontend-react /admin (PR
author: Thammanoon
date: 2026-11-09
id: l-dc1da136
scope: repo
status: active
touches:
  - "backend/internal/database/database.go#ClearChatAndActivityTables"
  - "backend/internal/database/database.go#ClearPublicTables"
  - "backend/internal/middleware/api_key_auth.go#RequireAdminKey"
---

## Decided
Admin console shipped at `frontend-react` `/admin` (PR #68, branch `feat/admin-console`, opened 2026-07-06). Lock screen → admin key in `sessionStorage` → sent as `X-Admin-Key`; 6 sections (Indexing / Wiki Sync / Business Units / Chat Debug / Reset / Activity Log). Old `admin/activity` route now redirects to `/admin?section=activity`.

Two new admin-guarded reset endpoints: `POST /api/index/reset?bu=<slug>|all` (RAG index) and `POST /api/system/reset` (chat_history + activity_logs only), each with a server-side `confirm`-token gate.

**Footgun (non-obvious):** `database.ClearPublicTables()` — the CLI's `reset all` — TRUNCATEs the ENTIRE `public` schema (documents, document_chunks, business_units, faq_*, chat_history, activity_logs — a full factory wipe), NOT just chat/logs despite its "reset all" name. That's why `/api/system/reset` uses the new narrow `database.ClearChatAndActivityTables()` instead, and `ClearPublicTables` is deliberately NOT exposed over HTTP. Never wire `ClearPublicTables` to a UI "reset chat" button.

Backend admin endpoints all guard with `middleware.RequireAdminKey` (`X-Admin-Key`); reset confirm tokens: index-BU = slug, index-all = `ALL`, chat+logs = `RESET-CHAT-LOGS`.

_From Claude Code's memory of this repo, last updated Jul 6._
