# Carmen Backend (Go Fiber)

บริการ API หลักของระบบ KB Carmen

หน้าที่หลัก:
- ให้ API สำหรับ wiki content, faq, activity, business units
- จัดการ indexing ลง PostgreSQL/pgvector (`<bu>.documents`, `<bu>.document_chunks`)
- sync เนื้อหาจาก git repo/wiki source
- native RAG chatbot ที่ `/api/chat/*` (intent → hybrid retrieval pgvector+FTS+RRF → LLM, NDJSON stream) ปรับจูนผ่าน `backend/config/{tuning,intents,path_rules,prompts}.yaml`
- บันทึก chat history/activity logs

## Run Local

```bash
cd backend
go mod download
cp .env.example .env
go run cmd/server/main.go
```

หรือผ่าน Make:

```bash
make run
make dev
make test
make build
```

## Environment สำคัญ

- `PORT` / `SERVER_PORT`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SCHEMA`
- `ADMIN_API_KEY`, `INTERNAL_API_KEY`
- `PRIVACY_HMAC_SECRET`
- `GIT_REPO_PATH`, `WIKI_CONTENT_PATH`
- `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BRANCH`
- `OPENROUTER_API_KEY`, `OPENROUTER_EMBED_MODEL`

## API กลุ่มหลัก

- System: `/health`, `/api/system/status`
- Wiki: `/api/wiki/*`, `/wiki-assets/*`
- Indexing: `/api/index/rebuild*`
- Chat (native RAG): `/api/chat/*`
- FAQ: `/api/faq/*`
- Activity: `/api/activity/*`
- BU admin: `/api/business-units/*`
- Webhook: `/webhook/github`

> เส้นทางที่เป็น admin/internal ใช้ API key ผ่าน header (`X-Admin-Key`, `X-Internal-API-Key`)

## Migration / CLI Operations

ตัว server รองรับคำสั่ง CLI:

```bash
go run cmd/server/main.go migrate <path-to-sql>     # ระบุไฟล์เสมอ
go run cmd/server/main.go reindex <bu>|all
go run cmd/server/main.go reset index <bu>|all      # truncate <bu>.documents/document_chunks
go run cmd/server/main.go reset all                 # truncate public activity/chat tables
```

> ⚠️ **อย่าใช้** `./server migrate` กับไฟล์ที่มี PL/pgSQL (`DO $$...$$` เช่น `0002_setup_multi_bu.sql`) — Go binary ตัด `;` ผิด ใช้ `psql` หรือ `scripts/migrate-docker.sh` ตามลำดับใน `migrations/README.md`

## Auto-provision (GitHub Actions)

Push markdown ใต้ `contents/<bu>/` เข้า `main` → workflow `.github/workflows/auto-provision-sync-reindex.yml` เรียก `provision/sync/rebuild` ผ่าน admin API ให้อัตโนมัติ ดูรายละเอียดใน `HANDOVER-ADD-NEW-BU.md`

## Swagger (OpenAPI)

- UI: `http://localhost:8080/swagger/index.html`
- regenerate:

```bash
cd cmd/server
go run github.com/swaggo/swag/cmd/swag@v1.16.4 init -g main.go -o ../../docs -d .,../../internal/apidoc,../../internal/models
```
