# Remove PDF Export (Gotenberg) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the PDF export feature in full across the Go backend, infra, and both frontends, eliminating the Gotenberg sidecar and the Next.js puppeteer PDF path; keep the Next.js DOCX export.

**Architecture:** This is a pure deletion across three independent areas — (1) the Go `internal/export/` package + handler + route + config (the Gotenberg system), (2) the Gotenberg sidecar in `docker-compose.yml` / `render.yaml` / `run_dev.sh`, and (3) the PDF UI in both frontends. The Next.js DOCX export (`html-to-docx`, `rewriteAndFilterImages`, `ssrf-guard.ts`) is unrelated to Gotenberg and stays.

**Tech Stack:** Go (Fiber), Next.js (App Router, bun), React SPA (Vite, bun), Docker Compose, Render blueprint YAML.

**TDD note (adapted for removal):** There is no new behavior to test-drive. The safety net for each task is: make the deletions/edits → run the existing build + test suite → grep to confirm the symbols/paths are gone → commit. Each task's "verify it fails/passes" steps are build + suite runs that must stay green.

## Global Constraints

- Single atomic PR: backend, infra, and both frontends change together so the SPA never calls a removed endpoint and the Next.js menu never offers a removed format. Use one branch (`chore/remove-pdf-export-gotenberg`, already created), commit per task.
- **Keep** the Next.js DOCX export end-to-end: `frontend/app/api/export/docx/route.ts`, `html-to-docx` dep, `rewriteAndFilterImages` in `frontend/lib/export-images.ts`, `frontend/lib/ssrf-guard.ts`, locale keys `export` + `export_doc`, and the export menu shell in `frontend/components/chat/carmen-message.tsx`.
- **Keep** the historical docs `docs/superpowers/specs/2026-06-23-go-export-endpoints-design.md` and `docs/superpowers/plans/2026-06-23-go-export-endpoints.md` unchanged (dated records).
- Frontend package manager is **bun** (`bun install`, `bun run build`, `bun test`).
- Backend module path is `github.com/new-carmen/backend`.

---

### Task 1: Remove the Go backend export feature (Gotenberg)

**Files:**
- Delete: `backend/internal/export/` (whole dir: `gotenberg.go`, `gotenberg_test.go`, `gotenberg_integration_test.go`, `ssrf.go`, `ssrf_test.go`, `images.go`, `images_test.go`, `template.go`, `template_test.go`)
- Delete: `backend/internal/api/export_handler.go`, `backend/internal/api/export_handler_test.go`
- Delete: `backend/internal/router/export_routes.go`, `backend/internal/router/export_routes_test.go`
- Delete: `backend/internal/config/config_export_test.go`
- Modify: `backend/internal/router/routes.go` (remove `RegisterExport(app)` call)
- Modify: `backend/internal/config/config.go` (remove `ExportConfig` struct, `Export` field, env reads, `normalizeGotenbergURL`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing — after this task the symbols `export.*`, `api.ExportHandler`, `router.RegisterExport`, `config.ExportConfig`, and `config.AppConfig.Export` no longer exist.

- [ ] **Step 1: Delete the export package and its handler/route/config-test files**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/knowledge-base-carmen
git rm -r backend/internal/export
git rm backend/internal/api/export_handler.go backend/internal/api/export_handler_test.go
git rm backend/internal/router/export_routes.go backend/internal/router/export_routes_test.go
git rm backend/internal/config/config_export_test.go
```

- [ ] **Step 2: Remove the `RegisterExport(app)` call**

In `backend/internal/router/routes.go`, delete this line (currently line 37):

```go
	RegisterExport(app)
```

The surrounding `SetupRoutes` block goes from:

```go
	RegisterActivity(app)
	RegisterExport(app)
	RegisterBusinessUnits(app)
```

to:

```go
	RegisterActivity(app)
	RegisterBusinessUnits(app)
```

- [ ] **Step 3: Remove `Export` from the config struct**

In `backend/internal/config/config.go`, remove the `Export ExportConfig` field from the `Config` struct:

```go
type Config struct {
	Server      ServerConfig
	Database    DatabaseConfig
	JWT         JWTConfig
	GitHub      GitHubConfig
	Git         GitConfig
	WikiSearch  WikiSearchConfig
	Chat        ChatConfig
	Translation TranslationConfig
	LLM         LLMConfig
	Export      ExportConfig
}
```

becomes:

```go
type Config struct {
	Server      ServerConfig
	Database    DatabaseConfig
	JWT         JWTConfig
	GitHub      GitHubConfig
	Git         GitConfig
	WikiSearch  WikiSearchConfig
	Chat        ChatConfig
	Translation TranslationConfig
	LLM         LLMConfig
}
```

- [ ] **Step 4: Remove the `ExportConfig` struct definition**

In `backend/internal/config/config.go`, delete:

```go
type ExportConfig struct {
	GotenbergURL string
	ImageBaseURL string
}
```

- [ ] **Step 5: Remove the `Export` initializer block**

In `backend/internal/config/config.go`, remove the `Export: ExportConfig{...}` entry from the config literal:

```go
		LLM: LLMConfig{
			APIKey:          getEnvFirst([]string{"LLM_API_KEY", "OPENROUTER_API_KEY"}, ""),
			APIBase:         getEnv("LLM_API_BASE", "https://openrouter.ai/api/v1"),
			ChatModel:       getEnvFirst([]string{"LLM_CHAT_MODEL", "OPENROUTER_CHAT_MODEL"}, "openai/gpt-4o-mini"),
			EmbedModel:      getEnvFirst([]string{"LLM_EMBED_MODEL", "OPENROUTER_EMBED_MODEL"}, "qwen/qwen3-embedding-8b"),
			IntentModel:     getEnvFirst([]string{"LLM_INTENT_MODEL", "OPENROUTER_INTENT_MODEL"}, "google/gemini-2.5-flash-lite"),
			FallbackModel:   getEnv("LLM_FALLBACK_MODEL", ""),
			MaxPromptTokens: getEnvAsInt("MAX_PROMPT_TOKENS", 6000),
			TimeoutSec:      getEnvAsInt("LLM_TIMEOUT_SECONDS", 60),
		},
		Export: ExportConfig{
			GotenbergURL: normalizeGotenbergURL(getEnv("GOTENBERG_URL", "")),
			ImageBaseURL: getEnv("EXPORT_IMAGE_BASE_URL", ""),
		},
	}
```

becomes:

```go
		LLM: LLMConfig{
			APIKey:          getEnvFirst([]string{"LLM_API_KEY", "OPENROUTER_API_KEY"}, ""),
			APIBase:         getEnv("LLM_API_BASE", "https://openrouter.ai/api/v1"),
			ChatModel:       getEnvFirst([]string{"LLM_CHAT_MODEL", "OPENROUTER_CHAT_MODEL"}, "openai/gpt-4o-mini"),
			EmbedModel:      getEnvFirst([]string{"LLM_EMBED_MODEL", "OPENROUTER_EMBED_MODEL"}, "qwen/qwen3-embedding-8b"),
			IntentModel:     getEnvFirst([]string{"LLM_INTENT_MODEL", "OPENROUTER_INTENT_MODEL"}, "google/gemini-2.5-flash-lite"),
			FallbackModel:   getEnv("LLM_FALLBACK_MODEL", ""),
			MaxPromptTokens: getEnvAsInt("MAX_PROMPT_TOKENS", 6000),
			TimeoutSec:      getEnvAsInt("LLM_TIMEOUT_SECONDS", 60),
		},
	}
```

- [ ] **Step 6: Remove the `normalizeGotenbergURL` function**

In `backend/internal/config/config.go`, delete the whole function (including its doc comment):

```go
// normalizeGotenbergURL ensures the Gotenberg base URL carries an http(s) scheme.
// Render wires GOTENBERG_URL from the private gotenberg service's `hostport`
// property, which is a bare "host:port" (no scheme) — the http client needs a
// scheme or it misparses "host" as the URL scheme. Empty stays empty (→ the
// export handler serves 503 when Gotenberg is unconfigured).
func normalizeGotenbergURL(raw string) string {
	v := strings.TrimSpace(raw)
	if v == "" {
		return ""
	}
	if strings.HasPrefix(v, "http://") || strings.HasPrefix(v, "https://") {
		return v
	}
	return "http://" + v
}
```

Note: `strings` is still imported and used elsewhere in `config.go`; do **not** remove the import. `go build` (next step) will confirm.

- [ ] **Step 7: Build the backend to verify no dangling references**

Run: `cd backend && make build`
Expected: builds successfully, no `undefined: RegisterExport`, no `export` import errors, no unused-import error.

- [ ] **Step 8: Run the backend test suite**

Run: `cd backend && make test`
Expected: PASS. The deleted export tests are gone; remaining suites are unaffected (none import `internal/export`).

- [ ] **Step 9: Confirm the symbols are gone**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/knowledge-base-carmen && grep -rn "internal/export\|RegisterExport\|GotenbergURL\|ExportConfig\|normalizeGotenbergURL" backend --include="*.go"`
Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add -A backend
git commit -m "$(cat <<'EOF'
refactor(backend): remove PDF export feature (Gotenberg)

Delete internal/export package, export_handler, export_routes, and the
ExportConfig/GOTENBERG_URL wiring. PDF export is being removed in full.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Remove the Gotenberg sidecar from infra

**Files:**
- Modify: `backend/docker-compose.yml` (remove `GOTENBERG_URL` env + `gotenberg` service)
- Modify: `render.yaml` (remove `GOTENBERG_URL` env + `gotenberg` pserv)
- Modify: `run_dev.sh` (remove the whole Gotenberg block)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing — no `gotenberg` service or `GOTENBERG_URL` reference remains in infra.

- [ ] **Step 1: Remove the Gotenberg env + service from `backend/docker-compose.yml`**

Remove the env lines under the `backend` service:

```yaml
      # HTML→PDF sidecar
      GOTENBERG_URL: http://gotenberg:3000
```

Then remove the entire `gotenberg` service block at the end of the file (from the comment header through EOF):

```yaml
  # ─── Gotenberg (HTML→PDF via Chromium) ─────────────────────────────────────
  # Reachable from the backend service at http://gotenberg:3000 (compose network).
  gotenberg:
    image: gotenberg/gotenberg:8
    restart: unless-stopped
    # internal only; the backend reaches it on the compose network
    expose:
      - "3000"
    # Security hardening: block external http(s) loads so injected <script> or
    # <img> tags cannot reach internal services via Gotenberg's Chromium.
    # data: and file: URLs are NOT blocked — inlined images use data: URIs and
    # the uploaded HTML is a local file.
    # verify flag vs Gotenberg 8 docs — https://gotenberg.dev/docs/configuration
    command:
      - "gotenberg"
      - "--chromium-deny-list=^https?://"
    # Additionally isolate this service at the network level (docker networks /
    # platform-level firewall rules) so Chromium cannot make outbound connections
    # even if the deny-list is bypassed.
```

The file now ends with the `backend` service's `healthcheck` block.

- [ ] **Step 2: Validate the compose file still parses**

Run: `cd backend && docker compose --env-file docker-compose.env.example config >/dev/null && echo OK`
Expected: prints `OK` (YAML valid, no `gotenberg` service). If Docker is unavailable, instead run `python3 -c "import yaml,sys; yaml.safe_load(open('docker-compose.yml')); print('OK')"` and confirm `OK`.

- [ ] **Step 3: Remove the `GOTENBERG_URL` env + `gotenberg` pserv from `render.yaml`**

Remove the env entry under `carmen-backend`'s `envVars`:

```yaml
      # HTML→PDF sidecar — wired automatically to the private gotenberg service's
      # internal host:port (no public URL, no manual placeholder to fill).
      # fromService returns "host:port" (no scheme); the backend prepends http://
      # (see config.go: GOTENBERG_URL is normalized to an http:// URL).
      - key: GOTENBERG_URL
        fromService:
          type: pserv
          name: gotenberg
          property: hostport
```

Then remove the entire `gotenberg` pserv entry from the `services:` list (through EOF):

```yaml
  # ─── Gotenberg (HTML→PDF via Chromium) — used by /api/export/pdf ─────────────
  # PRIVATE service: no public URL — only reachable over Render's internal network
  # by carmen-backend. It renders client-supplied HTML, so it must NOT be public.
  # NOTE: pserv has no free plan (min = starter, paid). Keep it in the same region
  # as carmen-backend for private networking.
  - type: pserv
    name: gotenberg
    runtime: image
    image:
      url: gotenberg/gotenberg:8
    plan: starter
    # Defense-in-depth: --chromium-deny-list blocks Chromium's OUTBOUND http(s)
    # loads (we already inline images server-side, so none are needed). For an
    # `runtime: image` service the container command is overridden via dockerCommand.
    # verify flag vs Gotenberg 8 docs — https://gotenberg.dev/docs/configuration
    dockerCommand: "gotenberg --chromium-deny-list=^https?://"
```

- [ ] **Step 4: Validate render.yaml still parses**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/knowledge-base-carmen && python3 -c "import yaml; yaml.safe_load(open('render.yaml')); print('OK')"`
Expected: prints `OK`.

- [ ] **Step 5: Replace `run_dev.sh` with the Gotenberg-free version**

Overwrite `run_dev.sh` with exactly:

```bash
#!/usr/bin/env bash
# Start Carmen development services:
#   - Go backend (8080)            — native RAG chat at /api/chat/*
#   - Next.js   frontend/ (3000)   — legacy App Router UI
#   - React SPA frontend-react/ (5173) — Vite SPA (the migration target)
# Runs everything in the background of one terminal; Ctrl-C stops them all.
set -uo pipefail

cyan='\033[0;36m'; yellow='\033[1;33m'; green='\033[0;32m'; nc='\033[0m'
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

printf "${cyan}Starting Carmen Development Services...${nc}\n"

pids=()
cleanup() {
  printf "\nStopping services...\n"
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup INT TERM EXIT

# 1. Go Backend (serves the native RAG chatbot at /api/chat/*).
printf "${yellow}--- Go Backend (Port 8080) ---${nc}\n"
( cd "$ROOT/backend" && go run cmd/server/main.go ) &
pids+=($!)

# 2. Frontend (Next.js)
printf "${yellow}--- Next.js Frontend (Port 3000) ---${nc}\n"
( cd "$ROOT/frontend" && bun run dev ) &
pids+=($!)

# 3. Frontend (React SPA — Vite). Points VITE_API_BASE at the local backend.
printf "${yellow}--- React SPA Frontend (Vite, Port 5173) ---${nc}\n"
( cd "$ROOT/frontend-react" && VITE_API_BASE="http://localhost:8080" bun run dev ) &
pids+=($!)

printf "\n${green}All services are starting (Ctrl-C to stop them all).${nc}\n"
printf "   - Go Backend:        http://localhost:8080\n"
printf "   - Next.js Frontend:  http://localhost:3000\n"
printf "   - React SPA (Vite):  http://localhost:5173\n"

# Wait for all background jobs; Ctrl-C triggers cleanup.
wait
```

- [ ] **Step 6: Lint the script**

Run: `bash -n run_dev.sh && echo OK`
Expected: prints `OK` (no syntax errors).

- [ ] **Step 7: Confirm no infra references remain**

Run: `grep -rn "gotenberg\|GOTENBERG" backend/docker-compose.yml render.yaml run_dev.sh`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add backend/docker-compose.yml render.yaml run_dev.sh
git commit -m "$(cat <<'EOF'
chore(infra): remove Gotenberg sidecar

Drop the gotenberg service from docker-compose and render.yaml (paid pserv)
and the Gotenberg block from run_dev.sh. PDF export is being removed.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Remove the export UI from the React SPA

PDF was the SPA's only export item, so the whole export button/menu is removed.

**Files:**
- Delete: `frontend-react/src/components/chat/carmen-message.export.test.tsx`
- Modify: `frontend-react/src/components/chat/carmen-message.tsx`
- Modify: `frontend-react/src/configs/locales.ts`
- Modify: `frontend-react/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing — `CarmenMessage` no longer renders an export control; locale keys `export`/`export_doc`/`export_pdf` no longer exist in the SPA.

- [ ] **Step 1: Delete the SPA export test**

```bash
git rm frontend-react/src/components/chat/carmen-message.export.test.tsx
```

- [ ] **Step 2: Trim the React import (drop `useEffect`)**

In `frontend-react/src/components/chat/carmen-message.tsx`, change:

```tsx
import { useState, useMemo, memo, useRef, useEffect } from "react";
```

to:

```tsx
import { useState, useMemo, memo, useRef } from "react";
```

(`useRef` stays — `contentRef` still wraps the rendered content. `AnimatePresence`/`motion` stay — the suggestions block uses them.)

- [ ] **Step 3: Delete the `IconExport`, `IconPdf`, and `IconSpinner` constants**

In `frontend-react/src/components/chat/carmen-message.tsx`, delete these three constants (they are used only by the export control):

```tsx
const IconExport = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);


const IconPdf = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 13h2a1 1 0 0 0 0-2H9v6" />
    <path d="M15 11h1.5a1.5 1.5 0 0 1 0 3H15v-3z" />
  </svg>
);

const IconSpinner = (
  <svg className="animate-spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);
```

- [ ] **Step 4: Delete the export state and outside-click effect**

In the component body, delete these state declarations:

```tsx
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState<"pdf" | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
```

(Keep `const contentRef = useRef<HTMLDivElement>(null);`.)

Then delete the outside-click effect:

```tsx
  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);
```

- [ ] **Step 5: Delete `handleExportPdf`**

Delete the whole function:

```tsx
  async function handleExportPdf() {
    setShowExportMenu(false);
    if (!contentRef.current) return;
    setExportLoading("pdf");
    try {
      // Server-side PDF via puppeteer — no main-thread blocking, no freeze.
      // Send the raw content HTML; the API route wraps it in a clean styled page
      // and renders it with headless Chromium (supports oklch/lab natively).
      const res = await fetch(`${API_BASE}/api/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: processedContent }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carmen-export-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // export failed — user sees no download, no action needed
    } finally {
      setExportLoading(null);
    }
  }
```

Note: `API_BASE` (imported on line 2) is now unused. Remove it from the import — change `import { API_BASE } from "@/lib/config";` by deleting that line **only if** `grep -n "API_BASE" frontend-react/src/components/chat/carmen-message.tsx` returns nothing else. (After this deletion it returns nothing, so remove the import line.)

- [ ] **Step 6: Delete the export dropdown JSX**

In the tools row, delete the entire export dropdown block:

```tsx
            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => { if (exportLoading === null) setShowExportMenu((v) => !v); }}
                disabled={exportLoading !== null}
                className="p-1 text-slate-400 dark:text-slate-500 transition-all duration-200 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:scale-110 rounded disabled:opacity-70 disabled:cursor-not-allowed"
                title={t("tools.export")}
              >
                {exportLoading !== null ? IconSpinner : IconExport}
              </button>

              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-1 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[110px] whitespace-nowrap"
                  >
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={exportLoading !== null}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {exportLoading === "pdf" ? IconSpinner : IconPdf}
                      {t("tools.export_pdf")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
```

The copy button and the feedback (`msg.msgId`) block around it stay unchanged.

- [ ] **Step 7: Remove the `export*` locale keys from the SPA**

In `frontend-react/src/configs/locales.ts`, remove the three keys from the `tools` type:

```tsx
    export: string;
    export_doc: string;
    export_pdf: string;
```

from the Thai `tools` block:

```tsx
      export: "ส่งออกไฟล์",
      export_doc: "ส่งออก Word",
      export_pdf: "ส่งออก PDF",
```

and from the English `tools` block:

```tsx
      export: "Export file",
      export_doc: "Export Word",
      export_pdf: "Export PDF",
```

- [ ] **Step 8: Remove the export mention from the SPA README**

Run: `grep -n -i "export\|pdf" frontend-react/README.md`
Delete any line/section that documents the PDF/export button (leave all non-export content intact).

- [ ] **Step 9: Verify no stray references remain in the SPA**

Run: `grep -rn "export_pdf\|export_doc\|tools.export\|handleExportPdf\|IconPdf\|IconExport\|IconSpinner\|showExportMenu\|exportLoading\|exportMenuRef\|API_BASE" frontend-react/src/components/chat/carmen-message.tsx frontend-react/src/configs/locales.ts`
Expected: no output.

- [ ] **Step 10: Build and test the SPA**

Run: `cd frontend-react && bun install && bun run build && bun test`
Expected: build succeeds; tests PASS (the removed export test no longer runs; no "unused variable"/"cannot find name" TS errors).

- [ ] **Step 11: Commit**

```bash
git add -A frontend-react
git commit -m "$(cat <<'EOF'
feat(spa): remove PDF export button from chat messages

PDF was the SPA's only export item; remove the whole export menu, its
handler/icons/state, the export test, and the export* locale keys.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Remove PDF from the Next.js frontend (keep DOCX)

The Next.js export menu keeps its Word item; only the PDF route, button, helper, and puppeteer dep are removed.

**Files:**
- Delete: `frontend/app/api/export/pdf/route.ts`
- Modify: `frontend/components/chat/carmen-message.tsx`
- Modify: `frontend/configs/locales.ts`
- Modify: `frontend/lib/export-images.ts`
- Modify: `frontend/__tests__/export-images.test.ts`
- Modify: `frontend/package.json` (+ `bun.lock` via `bun install`)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new. After this task: `/api/export/docx` and `rewriteAndFilterImages` still exist; `/api/export/pdf`, `embedSafeImages`, and `puppeteer` are gone.

- [ ] **Step 1: Delete the Next.js PDF route**

```bash
git rm frontend/app/api/export/pdf/route.ts
```

- [ ] **Step 2: Delete `IconPdf` from the Next.js component**

In `frontend/components/chat/carmen-message.tsx`, delete:

```tsx
const IconPdf = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 13h2a1 1 0 0 0 0-2H9v6" />
    <path d="M15 11h1.5a1.5 1.5 0 0 1 0 3H15v-3z" />
  </svg>
);
```

(Keep `IconExport`, `IconDocx`, `IconSpinner` — the DOCX item still uses them.)

- [ ] **Step 3: Narrow the `exportLoading` state type**

Change:

```tsx
  const [exportLoading, setExportLoading] = useState<"docx" | "pdf" | null>(null);
```

to:

```tsx
  const [exportLoading, setExportLoading] = useState<"docx" | null>(null);
```

- [ ] **Step 4: Delete `handleExportPdf`**

Delete the whole function:

```tsx
  async function handleExportPdf() {
    setShowExportMenu(false);
    if (!contentRef.current) return;
    setExportLoading("pdf");
    try {
      // Server-side PDF via puppeteer — no main-thread blocking, no freeze.
      // Send the raw content HTML; the API route wraps it in a clean styled page
      // and renders it with headless Chromium (supports oklch/lab natively).
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: processedContent }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carmen-export-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // export failed — user sees no download, no action needed
    } finally {
      setExportLoading(null);
    }
  }
```

(Keep `handleExportDocx`. `contentRef` stays — it still wraps the rendered content via `<div ref={contentRef}>` and is referenced by `handleExportDocx`'s sibling JSX; leaving it is correct and not an unused variable.)

- [ ] **Step 5: Delete the PDF menu button**

In the export dropdown, delete only the PDF button (keep the DOCX button above it):

```tsx
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={exportLoading !== null}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {exportLoading === "pdf" ? IconSpinner : IconPdf}
                      {t("tools.export_pdf")}
                    </button>
```

The DOCX button (`onClick={handleExportDocx}` … `{t("tools.export_doc")}`) remains as the only menu item.

- [ ] **Step 6: Remove the `export_pdf` locale key (keep `export` + `export_doc`)**

In `frontend/configs/locales.ts`, remove `export_pdf: string;` from the `tools` type, `export_pdf: "ส่งออก PDF",` from the Thai block, and `export_pdf: "Export PDF",` from the English block. Leave `export` and `export_doc` in all three places.

- [ ] **Step 7: Remove `embedSafeImages` from `frontend/lib/export-images.ts`**

Delete the `safeFetch` import (line 9), since only `embedSafeImages` used it:

```tsx
import { safeFetch } from "./ssrf-guard";
```

Delete the `FetchLike` type, the `EmbedDeps` interface, and the `embedSafeImages` function (with its doc comment):

```tsx
type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

export interface EmbedDeps {
  isSafe: UrlSafetyCheck;
  fetchFn?: FetchLike;
  timeoutMs?: number;
}

/**
 * PDF: fetch each safe image server-side and inline it as a base64 data URI so
 * the renderer never issues the request itself. Unsafe images are stripped and
 * never fetched. The fetch (default {@link safeFetch}) pins the connection to a
 * DNS-validated address (no rebinding) and does not follow redirects. data:/blob:
 * images are left untouched.
 */
export function embedSafeImages(html: string, baseUrl: string, deps: EmbedDeps): Promise<string> {
  const timeoutMs = deps.timeoutMs ?? 8000;
  const fetchFn: FetchLike = deps.fetchFn ?? ((u) => safeFetch(u, { timeoutMs }));

  return rewriteImgTags(html, async (src) => {
    const c = classify(src, baseUrl);
    if (c.kind === "keep") return { keep: true, src };
    if (c.kind === "strip") return { keep: false };
    // Pre-filter: strip clearly-unsafe hosts before attempting any connection.
    if (!(await deps.isSafe(c.url))) return { keep: false };

    try {
      // safeFetch re-resolves + pins the IP at connect time, closing the TOCTOU
      // window between the isSafe check above and the actual request.
      const res = await fetchFn(c.url);
      if (!res.ok) return { keep: true, src: c.url }; // redirect/error → leave as absolute URL
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type") ?? "image/png";
      return { keep: true, src: `data:${mime};base64,${buf.toString("base64")}` };
    } catch {
      return { keep: true, src: c.url };
    }
  });
}
```

Then update the file-level doc comment so it no longer says "Both helpers". Change:

```tsx
/**
 * Image-handling helpers for server-side document export, with SSRF protection.
 *
 * Both helpers process the `<img>` tags of attacker-supplied HTML and consult an
 * injected url-safety check (in production: {@link isUrlSafe} from ./ssrf-guard)
 * before any server-side fetch. Images whose target is unsafe are stripped.
 */
```

to:

```tsx
/**
 * Image-handling helper for server-side document export (DOCX), with SSRF
 * protection.
 *
 * It processes the `<img>` tags of attacker-supplied HTML and consults an
 * injected url-safety check (in production: {@link isUrlSafe} from ./ssrf-guard)
 * before any server-side fetch. Images whose target is unsafe are stripped.
 */
```

(`rewriteImgTags`, `classify`, `Classified`, `Decision`, `UrlSafetyCheck`, and `rewriteAndFilterImages` all stay — the DOCX path uses them.)

- [ ] **Step 8: Drop the PDF tests from `frontend/__tests__/export-images.test.ts`**

Change the import:

```tsx
import { rewriteAndFilterImages, embedSafeImages } from "@/lib/export-images";
```

to:

```tsx
import { rewriteAndFilterImages } from "@/lib/export-images";
```

Delete the entire `describe("embedSafeImages (PDF)", ...)` block (everything from that line to its closing `});` at the end of the file). Keep the `describe("rewriteAndFilterImages (DOCX)", ...)` block.

- [ ] **Step 9: Remove the `puppeteer` dependency**

In `frontend/package.json`, delete the line:

```json
    "puppeteer": "^25.2.0",
```

(Keep `"html-to-docx": "^1.8.0",`.)

- [ ] **Step 10: Update the lockfile**

Run: `cd frontend && bun install`
Expected: `bun.lock` updates to drop puppeteer and its transitive deps.

- [ ] **Step 11: Verify no PDF/puppeteer references remain in the frontend**

Run: `grep -rn "export/pdf\|embedSafeImages\|handleExportPdf\|export_pdf\|puppeteer\|IconPdf" frontend --include="*.ts" --include="*.tsx" --include="*.json" | grep -v "node_modules\|\.next/\|bun.lock"`
Expected: no output.

- [ ] **Step 12: Build and test the frontend**

Run: `cd frontend && bun run build && bun test`
Expected: build succeeds; tests PASS. The DOCX export tests still run and pass; no "cannot find name `embedSafeImages`"/`puppeteer` errors.

- [ ] **Step 13: Commit**

```bash
git add -A frontend
git commit -m "$(cat <<'EOF'
feat(frontend): remove PDF export, keep DOCX

Delete the puppeteer PDF route, the PDF menu item/icon/handler, the
embedSafeImages helper and its tests, the export_pdf locale key, and the
puppeteer dependency. The Word (DOCX) export is unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `backend/README.md`
- Modify: `sitemap.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing — docs no longer mention PDF export or Gotenberg (except the dated historical specs/plans, which are intentionally kept).

- [ ] **Step 1: Update `CLAUDE.md` — architecture bullet**

In the `backend/` architecture bullet, remove the trailing PDF-export sentence. Change the end of the bullet from:

```
The former Python `carmen-chatbot/` service was migrated into the Go backend and removed. It also serves **PDF export at `/api/export/pdf`** (chat-answer HTML → PDF via a **Gotenberg** sidecar; see Non-obvious conventions).
```

to:

```
The former Python `carmen-chatbot/` service was migrated into the Go backend and removed.
```

- [ ] **Step 2: Update `CLAUDE.md` — Non-obvious conventions**

Delete the entire PDF-export bullet:

```
- **PDF export (`POST /api/export/pdf`)** is native Go in `backend/internal/export/` + `internal/api/export_handler.go`: it SSRF-guards + inlines `<img>` as base64 (IP-pinned dialer in `ssrf.go`), wraps the body in a styled template, then renders via a **Gotenberg** (Chromium) sidecar. Public but **rate-limited** (10/min/IP) + 2 MB body cap; **PDF-only** (DOCX dropped — Gotenberg has no HTML→DOCX route). Set `GOTENBERG_URL` (empty → handler returns `503`). Gotenberg runs as a **separate service**: `gotenberg` in `backend/docker-compose.yml` for local dev; a private `pserv` in `render.yaml` with `GOTENBERG_URL` auto-wired via `fromService` (config.go prepends `http://` to the scheme-less internal `host:port`).
```

- [ ] **Step 3: Update `backend/README.md` — env section**

Delete the PDF Export env block:

```
**PDF Export (Gotenberg sidecar)**
- `GOTENBERG_URL` — endpoint ของ Gotenberg (Chromium) ที่ใช้ render HTML→PDF; **ว่าง → `POST /api/export/pdf` คืน `503`** (local dev: service `gotenberg` ใน `docker-compose.yml`; prod: private `pserv` ใน `render.yaml` wire ผ่าน `fromService`, config.go เติม `http://` ให้ host:port ที่ไม่มี scheme)
```

(Remove the heading, the bullet, and one surrounding blank line so the env list flows into the next `>` note cleanly.)

- [ ] **Step 4: Update `backend/README.md` — endpoint list**

Delete the Export endpoint bullet:

```
- **Export (PDF):** `POST /api/export/pdf` — รับ chat-answer HTML แล้ว render เป็น PDF ผ่าน Gotenberg sidecar; public แต่ rate-limit 10/min/IP + body cap 2 MB, **PDF-only** (ไม่มี DOCX); SSRF-guard + inline `<img>` เป็น base64; ต้องตั้ง `GOTENBERG_URL` (ว่าง → `503`)
```

- [ ] **Step 5: Update `sitemap.md` — narrative**

Change:

```
Owns wiki / FAQ / activity / indexing, the native RAG chatbot at `/api/chat/*`
(intent → hybrid retrieval pgvector + FTS + RRF → LLM, streams NDJSON), and
PDF export at `/api/export/pdf` (chat-answer HTML → PDF via a Gotenberg sidecar).
```

to:

```
Owns wiki / FAQ / activity / indexing and the native RAG chatbot at `/api/chat/*`
(intent → hybrid retrieval pgvector + FTS + RRF → LLM, streams NDJSON).
```

- [ ] **Step 6: Update `sitemap.md` — entry-points bullet + tree**

Delete the export entry-points bullet:

```
- `internal/api/export_handler.go` + `internal/export/` — PDF export `/api/export/pdf` (HTML → Gotenberg sidecar; SSRF-guard + base64 `<img>`, rate-limited 10/min/IP, PDF-only; needs `GOTENBERG_URL`).
```

Then refresh the auto-generated tree so it drops the now-deleted `export/` directory:

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/knowledge-base-carmen && python3 scripts/gen_sitemap.py`
Then `git diff sitemap.md` and confirm the only tree change is the removal of the `export/` line under `backend/internal/`. If `gen_sitemap.py` is unavailable, instead manually delete the `    export/` line from the tree.

- [ ] **Step 7: Confirm docs are clean**

Run: `grep -rn -i "gotenberg\|/api/export/pdf" CLAUDE.md backend/README.md sitemap.md`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md backend/README.md sitemap.md
git commit -m "$(cat <<'EOF'
docs: drop PDF export / Gotenberg references

Update CLAUDE.md, backend/README.md, and sitemap.md now that PDF export
and the Gotenberg sidecar are removed. Historical specs/plans kept as-is.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Final repo-wide verification and PR

**Files:** none (verification + PR only).

- [ ] **Step 1: Repo-wide Gotenberg sweep**

Run: `grep -rni "gotenberg" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git`
Expected: matches only in `docs/superpowers/specs/2026-06-23-go-export-endpoints-design.md`, `docs/superpowers/plans/2026-06-23-go-export-endpoints.md`, and the 2026-06-24 spec/plan for this change. No source/infra matches.

- [ ] **Step 2: Repo-wide PDF-endpoint sweep**

Run: `grep -rn "export/pdf" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git`
Expected: matches only in the dated `docs/superpowers/` files. No source matches.

- [ ] **Step 3: Full builds + tests (final gate)**

Run each and confirm success:
- `cd backend && make build && make test`
- `cd frontend && bun run build && bun test`
- `cd frontend-react && bun run build && bun test`

Expected: all green. The Next.js DOCX export still builds and its tests pass.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin chore/remove-pdf-export-gotenberg
gh pr create --base main --title "Remove PDF export (Gotenberg)" --body "$(cat <<'EOF'
Removes the PDF export feature in full.

- **Backend:** deletes `internal/export/` (Gotenberg client + SSRF/image/template), the export handler/route, and the `ExportConfig`/`GOTENBERG_URL` wiring.
- **Infra:** drops the `gotenberg` service from `docker-compose.yml` and the paid `gotenberg` pserv from `render.yaml`; removes the Gotenberg block from `run_dev.sh`.
- **React SPA:** removes the export button/menu (PDF was its only item) + the export* locale keys.
- **Next.js:** removes the puppeteer PDF route, the PDF menu item, `embedSafeImages`, the `puppeteer` dep, and the `export_pdf` locale key. **Keeps DOCX export** (`html-to-docx`).
- **Docs:** updates CLAUDE.md, backend/README.md, sitemap.md; keeps the dated historical specs/plans.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Part 1 (Go backend) → Task 1 ✓
- Part 2 (infra) → Task 2 ✓
- Part 3 (React SPA) → Task 3 ✓
- Part 4 (Next.js, keep DOCX) → Task 4 ✓
- Part 5 (docs) → Task 5 ✓
- "Single atomic PR" → one branch, Task 6 opens the PR ✓
- "Keep DOCX / historical specs" → enforced in Global Constraints + Tasks 4/5 ✓
- Verification section of the spec → Task 6 + per-task build/test/grep steps ✓

**Placeholder scan:** No TBD/TODO; every code/edit step shows the exact current text to remove or replace. No "add error handling"/"similar to" placeholders.

**Type consistency:** `exportLoading` narrowed to `"docx" | null` only in Next.js (Task 4); the SPA removes the state entirely (Task 3). `rewriteAndFilterImages`/`embedSafeImages` names match `frontend/lib/export-images.ts`. `RegisterExport`, `ExportConfig`, `normalizeGotenbergURL`, `GotenbergURL` names match `backend/`. Import trims (`useEffect` in SPA, `API_BASE` in SPA, `safeFetch` in Next.js) are each guarded by a build step that would catch a miss.
