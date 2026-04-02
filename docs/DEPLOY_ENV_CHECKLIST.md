# คู่มือ env ตอน deploy (Backend / carmen-chatbot / Frontend)

แยกเป็น 3 ส่วน: ค่าที่ **ก้อปไปใส่ได้เลย** กับค่าที่ **ต้องหามาใส่เอง**

---

## 1) Backend (Go)

### ก้อปไปใส่ได้เลย (ค่าคงที่ / ค่าเริ่มต้นที่โค้ดรองรับ)

| ตัวแปร | ค่าที่ก้อปได้ |
|--------|----------------|
| `SERVER_HOST` | `0.0.0.0` (production) |
| `SERVER_PORT` | `8080` |
| `JWT_EXPIRY` | `24h` |
| `DB_PORT` | `5432` |
| `DB_SCHEMA` | `carmen,public` |
| `VECTOR_DIMENSION` | `1536` |
| `GITHUB_REPO_BASE_URL` | `https://github.com` |
| `GITHUB_API_BASE_URL` | `https://api.github.com` |
| `GITHUB_BRANCH` / `GIT_SYNC_BRANCH` | ตาม repo คุณ เช่น `main` |
| `GITHUB_WEBHOOK_BRANCH` | เช่น `main` หรือ `wiki-content` ให้ตรงที่ตั้งใน GitHub |
| `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` | ถ้า repo จริงคือ `Sunshine050` / `new-carmen` ก้อปจาก `.env.example` ได้ |
| `GIT_REPO_URL` | `https://github.com/Sunshine050/new-carmen.git` ถ้า repo จริงแบบนี้ |
| `WIKI_DEFAULT_BU` | `carmen` |
| `WIKI_CARMEN_GIT_PATH` | `carmen_cloud` |
| `WIKI_CHUNK_SIZE` | `500` |
| `WIKI_CHUNK_OVERLAP` | `100` |
| `WIKI_SEARCH_LIMIT` | `20` |
| `WIKI_VECTOR_DISTANCE_MAX` | `0.3` |
| `WIKI_SNIPPET_MAX_LEN` | `200` |
| `CHAT_CONTEXT_LIMIT` | `10` |
| `CHAT_MAX_CONTEXT_CHARS` | `8000` |
| `CHAT_MAX_CHUNK_CONTENT` | `2000` |
| `CHAT_HISTORY_ENABLED` | `true` |
| `CHAT_HISTORY_SIMILARITY_THRESHOLD` | `0.15` |
| `INDEXING_TIMEOUT_MINUTES` | `60` |
| `WEBHOOK_INDEXING_TIMEOUT_MINUTES` | `30` |
| `LLM_API_BASE` | `https://openrouter.ai/api/v1` |
| `LLM_CHAT_MODEL` / `OPENROUTER_CHAT_MODEL` | เช่น `openai/gpt-4o-mini` |
| `LLM_EMBED_MODEL` / `OPENROUTER_EMBED_MODEL` | เช่น `qwen/qwen3-embedding-8b` |
| `LLM_TIMEOUT_SECONDS` | `60` |
| `TRANSLATION_API_BASE_URL` | `https://translation.googleapis.com/language/translate/v2` |
| `TRANSLATION_TIMEOUT_SECONDS` | `30` |

### ยังไม่ครบ — ต้องหามาใส่เอง (ไม่มีใน repo เป็นของจริง)

| ตัวแปร | ต้องทำอะไร |
|--------|-------------|
| `ENVIRONMENT` | production: ใส่ `production` |
| `STRICT_ENV_ONLY` | ถ้าใช้ strict: `true` (ต้องมีครบทุก key ที่โค้ดกำหนด) |
| `CORS_ORIGINS` | Go Fiber: ใส่ `https://*.vercel.app` ให้ครบทุกโปรเจกต์/preview บน Vercel ได้ในค่าเดียว; หรือคั่นหลาย URL; โดเมนส่วนตัวให้เติมเอง (production ห้าม `*` อย่างเดียว) |
| `PORT` | บน Fly มักไม่ต้องใส่ (แพลตฟอร์มใส่ให้); ที่อื่นให้ตรงพอร์ตที่รัน |
| `PYTHON_CHATBOT_URL` | `https://...` ของ FastAPI หลัง deploy |
| `ADMIN_API_KEY` | สุ่มใหม่ `openssl rand -hex 32` (อย่าใช้ค่าตัวอย่างใน repo) |
| `INTERNAL_API_KEY` | สุ่มใหม่แยกจาก admin; เอาไปคู่กับ Python `GO_BACKEND_INTERNAL_API_KEY` |
| `PRIVACY_HMAC_SECRET` | สุ่มใหม่ `openssl rand -hex 32` |
| `JWT_SECRET` | สุ่มใหม่ `openssl rand -hex 32` |
| `DB_HOST` `DB_USER` `DB_PASSWORD` `DB_NAME` | จากผู้ให้บริการ Postgres |
| `DB_SSLMODE` | production มัก `require` |
| `GITHUB_TOKEN` | Personal / fine-grained token ที่อ่าน repo ได้ |
| `GITHUB_WEBHOOK_SECRET` | สุ่มแล้วไปใส่ใน GitHub Webhook ให้ตรงกัน |
| `GIT_REPO_PATH` `WIKI_CONTENT_PATH` `WIKI_CARMEN_PATHS` | path บนเครื่อง/container จริง (เช่น `/app/wiki-content`, `/app/carmen_cloud`) |
| `LLM_API_KEY` และ `OPENROUTER_API_KEY` | key จริงจาก OpenRouter (ใส่ค่าเดียวกันทั้งสองก็ได้) |
| `GOOGLE_TRANSLATE_API_KEY` | ถ้า `TRANSLATION_ENABLED=true` |
| `TRANSLATION_ENABLED` | `true` / `false` ตามว่าจะแปลหรือไม่ |

---

## 2) carmen-chatbot (Python)

### ก้อปไปใส่ได้เลย

| ตัวแปร | ค่าที่ก้อปได้ |
|--------|----------------|
| `LLM_API_BASE` | `https://openrouter.ai/api/v1` |
| `LLM_CHAT_MODEL` / `LLM_INTENT_MODEL` | ตามที่ต้องการ เช่น `google/gemini-2.5-flash-lite` |
| `LLM_EMBED_MODEL` | `qwen/qwen3-embedding-8b` |
| `LLM_FALLBACK_MODEL` | ว่างได้ |
| `DB_PORT` | `5432` |
| `DB_SCHEMA` | `carmen,public` |
| `VECTOR_DIMENSION` | `1536` |
| `RATE_LIMIT_PER_MINUTE` | `20/minute` |
| `DAILY_REQUEST_LIMIT` | `500` |
| `MAX_PROMPT_TOKENS` | `6000` |

### ยังไม่ครบ — ต้องหามาใส่เอง

| ตัวแปร | ต้องทำอะไร |
|--------|-------------|
| `ENVIRONMENT` | production: `production` |
| `LLM_API_KEY` | OpenRouter จริง |
| `DB_HOST` `DB_USER` `DB_PASSWORD` `DB_NAME` | ชุดเดียวกับ DB ที่ chatbot ใช้ (มักเดียวกับ backend) |
| `DB_SSLMODE` | production มัก `require` |
| `CORS_ORIGINS` | origin ของ Vercel (หรือหลายค่าคั่นด้วย comma) |
| `WIKI_CONTENT_PATH` | path จริงไปโฟลเดอร์เนื้อหา wiki บนเครื่องรัน Python |
| `GO_BACKEND_URL` | `https://...` ของ Go API หลัง deploy |
| `GO_BACKEND_INTERNAL_API_KEY` | **ต้องเท่ากับ** `INTERNAL_API_KEY` ของ backend |
| `PRIVACY_HMAC_SECRET` | อย่างน้อย 32 ตัวอักษร (แนะนำ `openssl rand -hex 32`) — ถ้าให้สอดคล้องกับ Go อาจใช้คู่กับ `PRIVACY_HMAC_SECRET` ฝั่ง Go |

---

## 3) Frontend (Vercel)

### ก้อปไปใส่ได้เลย

| ตัวแปร | ค่าที่ก้อปได้ |
|--------|----------------|
| ชื่อตัวแปร | `NEXT_PUBLIC_API_BASE` เท่านั้นที่ใช้ใน `lib/config.ts` |

ค่า **ไม่มีส่วนที่ก้อป “คงที่” ได้ทั้งบรรทัด** — เพราะต้องเป็น URL ของ API จริง

### ยังไม่ครบ — ต้องหามาใส่เอง

| ตัวแปร | ต้องทำอะไร |
|--------|-------------|
| `NEXT_PUBLIC_API_BASE` | `https://<โดเมน-backend-จริง>` ไม่มี `/` ท้าย |

หลังใส่ใน Vercel ต้อง **build/deploy ใหม่** เพราะเป็น `NEXT_PUBLIC_*`

---

## สรุปหนึ่งบรรทัด

**ก้อปได้เลย** = พอร์ต, URL สาธารณะของ Git/OpenRouter, ตัวเลข tuning, โมเดลชื่อ, และบรรทัดว่างของฟีเจอร์ที่ปิด — **ต้องหาเอง** = DB, token GitHub/OpenRouter, secret ทุกแบบ, URL สามขา (Go / Python / Vercel), path บนเซิร์ฟเวอร์จริง
