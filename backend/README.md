# Carmen Backend (Go Fiber)

บริการ API หลักของระบบ KB Carmen

หน้าที่หลัก:
- ให้ API สำหรับ wiki content, faq, activity, business units
- จัดการ indexing ลง PostgreSQL/pgvector (`<bu>.documents`, `<bu>.document_chunks`)
- sync เนื้อหาจาก git repo/wiki source
- proxy chat routes ไป Python chatbot
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
- `PYTHON_CHATBOT_URL`
- `GIT_REPO_PATH`, `WIKI_CONTENT_PATH`
- `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BRANCH`
- `OPENROUTER_API_KEY`, `OPENROUTER_EMBED_MODEL`

## API กลุ่มหลัก

- System: `/health`, `/api/system/status`
- Wiki: `/api/wiki/*`, `/wiki-assets/*`
- Indexing: `/api/index/rebuild*`
- Chat (proxy + internal): `/api/chat/*`
- FAQ: `/api/faq/*`
- Activity: `/api/activity/*`
- BU admin: `/api/business-units/*`
- Webhook: `/webhook/github`

> เส้นทางที่เป็น admin/internal ใช้ API key ผ่าน header (`X-Admin-Key`, `X-Internal-API-Key`)

## Migration / CLI Operations

ตัว server รองรับคำสั่ง CLI:

```bash
go run cmd/server/main.go migrate
go run cmd/server/main.go reindex carmen
go run cmd/server/main.go reindex all
go run cmd/server/main.go reset index carmen
go run cmd/server/main.go reset index all
go run cmd/server/main.go reset all
```

สำหรับ migration เชิง production (ไฟล์ SQL ที่มี PL/pgSQL) แนะนำใช้ `psql` ตามแนวทางใน `migrations/README.md`

## Swagger (OpenAPI)

- UI: `http://localhost:8080/swagger/index.html`
- regenerate:

```bash
cd cmd/server
go run github.com/swaggo/swag/cmd/swag@v1.16.4 init -g main.go -o ../../docs -d .,../../internal/apidoc,../../internal/models
```
