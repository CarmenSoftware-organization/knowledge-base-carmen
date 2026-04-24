# Carmen Chatbot

บริการ Python FastAPI สำหรับแชตบอท RAG ของระบบ Carmen

## บทบาทในระบบ

- รับคำถามจาก Go backend ผ่าน `/api/chat/stream` และ `/api/chat/`
- ทำ intent detection, query rewrite, retrieval, generation
- ค้นข้อมูลจาก PostgreSQL + pgvector (`<bu>.documents`, `<bu>.document_chunks`)
- ส่งผลแบบ NDJSON stream (`status`, `chunk`, `sources`, `suggestions`, `done`)
- บันทึกประวัติแชต (direct DB หรือ callback ไป Go backend ตาม config)

## Run Local

```bash
cd carmen-chatbot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python start_server.py
```

หรือ:

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

health:

```bash
curl http://localhost:8000/api/health
```

## Environment สำคัญ

- `LLM_API_KEY`, `LLM_API_BASE`
- `LLM_CHAT_MODEL`, `LLM_INTENT_MODEL`, `LLM_EMBED_MODEL`, `LLM_FALLBACK_MODEL`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE`, `DB_SCHEMA`
- `VECTOR_DIMENSION` (ต้องตรงกับ vector column ใน DB)
- `MAX_PROMPT_TOKENS`, `RATE_LIMIT_PER_MINUTE`, `DAILY_REQUEST_LIMIT`
- `WIKI_CONTENT_PATH`
- `GO_BACKEND_URL`, `GO_BACKEND_INTERNAL_API_KEY`
- `PRIVACY_HMAC_SECRET`

## API หลัก

- `POST /api/chat/stream` — แนะนำสำหรับ production UI
- `POST /api/chat/` — non-stream response
- `DELETE /api/chat/clear/{room_id}` — clear in-memory room history
- `POST /api/chat/feedback/{message_id}` — บันทึก feedback
- `GET /api/health` — service/db health
- `GET /images/{path}` — serve image จาก content tree

## RAG Pipeline (ย่อ)

1. Intent routing (regex -> vector -> LLM fallback)
2. Rewrite follow-up question (เมื่อมี history)
3. Thai-aware query handling + translation สำหรับ query ที่ไม่ใช่ไทย
4. Hybrid retrieval (pgvector + FTS + RRF)
5. Path boosting จาก `backend/config/path_rules.yaml`
6. Token budgeting + prompt assembly จาก `backend/config/prompts.yaml`
7. LLM generation + streamed events

ปรับพารามิเตอร์ได้ที่:
- `backend/config/tuning.yaml`
- `backend/config/intents.yaml`
- `backend/config/path_rules.yaml`
