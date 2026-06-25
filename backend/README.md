# Carmen Backend (Go Fiber)

บริการ API หลักของระบบ KB Carmen

หน้าที่หลัก:
- ให้ API สำหรับ wiki content, faq, activity, business units
- จัดการ indexing ลง PostgreSQL/pgvector (`public.documents`, `public.document_chunks` แยกแต่ละ BU ด้วย `bu_id`)
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

> `make dev` ใช้ hot reload ผ่าน [air](https://github.com/air-verse/air) — ต้องติดตั้งก่อน: `go install github.com/air-verse/air@latest` แล้วให้แน่ใจว่า `$(go env GOPATH)/bin` (ปกติ `~/go/bin`) อยู่ใน `PATH` ไม่งั้น `make dev` จะขึ้น `air: No such file or directory`

## Environment สำคัญ

**Core**
- `PORT` / `SERVER_PORT`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SCHEMA`
- `ADMIN_API_KEY`, `INTERNAL_API_KEY`
- `PRIVACY_HMAC_SECRET` — ใช้ HMAC hash user_id ก่อนเก็บ chat_history (ต้อง ≥32 ตัวอักษร)
- `GIT_REPO_PATH`, `WIKI_CONTENT_PATH`
- `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BRANCH`

**LLM / Embeddings (ใช้ทั้ง indexing + native chat — OpenAI-compatible เช่น OpenRouter)**
- `LLM_API_KEY` — API key (OpenRouter / OpenAI-compatible)
- `LLM_API_BASE` (default `https://openrouter.ai/api/v1`)
- `LLM_CHAT_MODEL` (default `stepfun/step-3.5-flash:free`) — โมเดลตอบคำถาม
- `LLM_INTENT_MODEL` (default `google/gemini-2.5-flash-lite`) — โมเดล intent classification + query rewrite/translate
- `LLM_FALLBACK_MODEL` (optional) — retry 1 ครั้งเมื่อ chat model หลักล่มก่อน stream
- `LLM_EMBED_MODEL` (default `qwen/qwen3-embedding-8b`)
- `VECTOR_DIMENSION` (default 2000 ใน prod) — ต้องตรงกับมิติคอลัมน์ `vector(N)` ใน DB (ดู `migrations/README.md`)
- `MAX_PROMPT_TOKENS` (default 6000)

**Chat behaviour / limits**
- `CHAT_CONFIG_DIR` (default `config`) — โฟลเดอร์ YAML (tuning/intents/path_rules/prompts); ตั้ง override เวลารัน test จาก subdir
- `RATE_LIMIT_PER_MINUTE` (default `20/minute`) — per-IP rate limit บน `/api/chat/{ask,stream,feedback,clear}`
- `DAILY_REQUEST_LIMIT` (default 1000, `0` = ไม่จำกัด) — daily budget cap (บังคับทั้ง /ask และ /stream)
- `CHAT_CONTEXT_LIMIT`, `CHAT_MAX_CONTEXT_CHARS` (8000), `CHAT_MAX_CHUNK_CONTENT` (2000)
- `CHAT_HISTORY_ENABLED` (true), `CHAT_HISTORY_SIMILARITY_THRESHOLD` (0.15) — semantic cache

> พฤติกรรม RAG ปรับจูนผ่าน YAML ไม่ต้องแก้โค้ด: `config/{tuning,intents,path_rules,prompts}.yaml` (เกณฑ์ intent, top_k/max_distance/rrf_k, path boost, prompts, locale).

## API กลุ่มหลัก

- System: `/health`, `/api/system/status`
- Wiki: `/api/wiki/*`, `/wiki-assets/*`
- Indexing: `/api/index/rebuild*`
- **Chat (native RAG):**
  - `POST /api/chat/stream` — streaming NDJSON (`status`/`sources`/`chunk`/`suggestions`/`done`) — endpoint หลักที่ frontend ใช้
  - `POST /api/chat/ask` — non-streaming JSON `{answer, sources}`
  - `POST /api/chat/feedback/:message_id` — thumbs up/down (`{score: 1|-1, bu, username}`)
  - `DELETE /api/chat/clear/:room_id` — เคลียร์ห้อง (no-op ack; history เป็นของ frontend)
  - admin/internal: `POST /api/chat/record-history`, `GET /api/chat/history/list`, `POST /api/chat/route-test`, `POST /api/chat/intent-test`
- FAQ: `/api/faq/*`
- Activity: `/api/activity/*`
- BU admin: `/api/business-units/*`
- Webhook: `/webhook/github`

> เส้นทางที่เป็น admin/internal ใช้ API key ผ่าน header (`X-Admin-Key`, `X-Internal-API-Key`). `bu` ที่รับจาก body/query ถูก validate ด้วย slug whitelist แล้ว resolve เป็น `bu_id` (UUID) เพื่อใช้เป็น parameter ใน SQL (ไม่ฉีดชื่อ schema เข้า query)

## Migration / CLI Operations

ตัว server รองรับคำสั่ง CLI:

```bash
go run cmd/server/main.go migrate <path-to-sql>     # ระบุไฟล์เสมอ
go run cmd/server/main.go reindex <bu>|all
go run cmd/server/main.go reset index <bu>|all      # delete a BU's rows in public.documents/document_chunks (all = TRUNCATE both)
go run cmd/server/main.go reset all                 # truncate public activity/chat tables
```

> ⚠️ **อย่าใช้** `./server migrate` กับไฟล์ที่มี PL/pgSQL (`DO $$...$$` เช่น `0001_init_schema.sql`) — Go binary ตัด `;` ผิด ใช้ `psql` หรือ `scripts/migrate-docker.sh` ตามลำดับใน `migrations/README.md`

## Auto-provision (GitHub Actions)

Push markdown ใต้ `contents/<bu>/` เข้า `main` → workflow `.github/workflows/auto-provision-sync-reindex.yml` เรียก `provision/sync/rebuild` ผ่าน admin API ให้อัตโนมัติ ดูรายละเอียดใน `../manual/HANDOVER-ADD-NEW-BU.md`

## Swagger (OpenAPI)

- UI: `http://localhost:8080/swagger/index.html`
- regenerate:

```bash
# run from the backend/ directory
go run github.com/swaggo/swag/cmd/swag@v1.16.6 init -g main.go -o docs -d ./cmd/server,./internal/apidoc,./internal/models,./internal/services,./internal/api/response
```
