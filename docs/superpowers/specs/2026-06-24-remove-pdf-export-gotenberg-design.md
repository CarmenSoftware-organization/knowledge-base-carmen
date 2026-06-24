# Remove PDF Export (Gotenberg) — Design

**Date:** 2026-06-24
**Status:** Approved
**Topic:** Remove the PDF export feature entirely across backend, infra, and both frontends; keep the Next.js DOCX export.

## Goal

Remove the PDF export feature in full. This eliminates the **Gotenberg** Chromium sidecar (a paid Render `pserv` with no free plan) and the **puppeteer**-based PDF path in the Next.js frontend. The Next.js **DOCX** export (`html-to-docx`) is unrelated to Gotenberg and **stays**.

## Background — two independent export systems

There are two completely separate export implementations in the repo:

| System | Uses Gotenberg? | PDF | DOCX |
|---|---|---|---|
| **A. `frontend/` (Next.js, legacy-but-active)** | No | `puppeteer` (bundles Chromium) at `app/api/export/pdf/route.ts` | `html-to-docx` at `app/api/export/docx/route.ts` |
| **B. `backend/` (Go) + `frontend-react/` (SPA)** | **Yes** | Go `POST /api/export/pdf` → Gotenberg sidecar | none (already dropped) |

Both frontends are deployed/active. Gotenberg lives **only** in system B. "Remove PDF" therefore spans both systems.

Verification performed before writing this spec:
- Go `internal/export/` package is imported only by `export_handler.go` + `export_routes.go` (+ tests) — nothing else uses its SSRF/image/template helpers. Safe to delete whole package.
- Go `ExportConfig` (`GotenbergURL` + `ImageBaseURL`) is used only by the export feature.
- `puppeteer` is referenced only by `frontend/package.json`, the Next.js PDF route, and a comment in `frontend/components/chat/carmen-message.tsx`.
- `frontend/lib/export-images.ts` exports `rewriteAndFilterImages` (DOCX — keep) and `embedSafeImages` (PDF — remove); `frontend/lib/ssrf-guard.ts` is used by the DOCX route too — keep.
- The React SPA export menu has PDF as its **only** item → the whole export button/menu is removed there.

## Scope

### Part 1 — Go backend (Gotenberg system B)

Delete the whole `internal/export/` package (PDF-only, no external importers):

- Delete `backend/internal/export/` entirely: `gotenberg.go`, `gotenberg_test.go`, `gotenberg_integration_test.go`, `ssrf.go`, `ssrf_test.go`, `images.go`, `images_test.go`, `template.go`, `template_test.go`.
- Delete `backend/internal/api/export_handler.go` (+ `export_handler_test.go`).
- Delete `backend/internal/router/export_routes.go` (+ `export_routes_test.go`).
- Edit `backend/internal/router/routes.go` — remove the `RegisterExport(app)` call.
- Edit `backend/internal/config/config.go` — remove the entire `ExportConfig` struct, the `Export` field on the config struct, `normalizeGotenbergURL`, and the env reads (`GOTENBERG_URL`, `EXPORT_IMAGE_BASE_URL`).
- Delete `backend/internal/config/config_export_test.go`.

**Decision 1:** Remove all of `ExportConfig`, including `ImageBaseURL` — it is used only by export.

### Part 2 — Infra / Gotenberg sidecar

- Edit `backend/docker-compose.yml` — remove the `gotenberg` service and the `GOTENBERG_URL` env on the backend service.
- Edit `render.yaml` — remove the `pserv` named `gotenberg` and the `GOTENBERG_URL` `fromService` wiring on the backend (removes the paid sidecar).
- Edit `run_dev.sh` — remove the entire Gotenberg block (container vars, `docker run`, summary print, header comments) and update the `/api/export/pdf` mentions.

### Part 3 — frontend-react (SPA) — PDF was the only export

- Edit `frontend-react/src/components/chat/carmen-message.tsx` — remove the export button/menu entirely: `handleExportPdf`, icons (`IconPdf`, `IconExport`), state (`exportLoading`, `showExportMenu`, `exportMenuRef`), the outside-click effect, and the menu JSX.
- Delete `frontend-react/src/components/chat/carmen-message.export.test.tsx`.
- Edit `frontend-react/src/configs/locales.ts` — remove keys `export`, `export_doc`, `export_pdf` (no export UI remains in the SPA). Confirm no other SPA file references these keys before removing.
- Edit `frontend-react/README.md` — remove the export section.

### Part 4 — frontend (Next.js) — keep DOCX, remove only PDF

- Delete `frontend/app/api/export/pdf/route.ts` (puppeteer PDF route).
- Edit `frontend/components/chat/carmen-message.tsx` — remove `handleExportPdf`, `IconPdf`, the PDF menu item, and drop `"pdf"` from the `exportLoading` union type. **Keep** the export menu — it now shows Word only.
- Edit `frontend/configs/locales.ts` — remove `export_pdf` (keep `export`, `export_doc`).
- Edit `frontend/lib/export-images.ts` — remove `embedSafeImages` (PDF); keep `rewriteAndFilterImages` (DOCX). Keep `frontend/lib/ssrf-guard.ts` (DOCX route uses `isUrlSafe`).
- Edit `frontend/__tests__/export-images.test.ts` — remove the `embedSafeImages (PDF)` describe block; keep the `rewriteAndFilterImages (DOCX)` tests.
- Edit `frontend/package.json` — remove the `puppeteer` dependency.

**Decision 2:** Remove `puppeteer` from `package.json` — it is used only by the PDF route and pulls a heavy Chromium download.

### Part 5 — Documentation

- Edit `CLAUDE.md` — remove the PDF export / Gotenberg references (architecture bullet, Non-obvious conventions PDF-export paragraph).
- Edit `backend/README.md` — remove PDF export / Gotenberg sections and env docs.
- Edit `sitemap.md` — remove the export endpoint mention.

**Decision 3:** Leave `docs/superpowers/specs/2026-06-23-go-export-endpoints-design.md` and `docs/superpowers/plans/2026-06-23-go-export-endpoints.md` **unchanged** — they are dated historical records, not active docs.

## Out of scope / explicitly kept

- Next.js DOCX export (`frontend/app/api/export/docx/route.ts`, `html-to-docx`, `rewriteAndFilterImages`, `ssrf-guard.ts`, the `export`/`export_doc` locale keys, the export menu shell in the Next.js component).
- Historical spec/plan docs dated 2026-06-23.

## Verification

- Backend: `cd backend && make build && make test` — must compile with no dangling imports; export tests gone.
- Next.js: `cd frontend && bun run build && bun test` — DOCX export still builds and passes; no `puppeteer` import remains.
- React SPA: `cd frontend-react && bun run build && bun test` — builds and passes; export test removed.
- Repo sweep: `grep -ri gotenberg` returns only the historical `docs/superpowers/.../2026-06-23-go-export-*` files.
- Repo sweep: `grep -rn "export/pdf"` returns nothing in source (build artifacts under `.next/` ignored).

## Delivery

**Decision 4:** Ship as a single atomic PR. Backend, infra, and both frontends must change together so the SPA never calls a removed endpoint and the Next.js menu never offers a removed format.
