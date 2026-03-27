---
title: README
description: 
published: true
date: 2026-03-25T07:49:47.217Z
tags: 
editor: markdown
dateCreated: 2026-03-19T08:00:35.495Z
---

# Carmen Chatbot

AI-powered chatbot for **Carmen Enterprise Software** — uses RAG (Retrieval-Augmented Generation) with PostgreSQL/pgvector for knowledge retrieval and OpenRouter LLM API for response generation.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.10+, FastAPI (async), uvicorn (single worker) |
| **LLM Provider** | [OpenRouter](https://openrouter.ai) — chat, intent/rewrite, embedding |
| **Vector DB** | PostgreSQL + [pgvector](https://github.com/pgvector/pgvector) |
| **Search** | Hybrid: pgvector cosine + PostgreSQL FTS, fused with RRF |
| **Embeddings** | OpenRouter Embedding API (`qwen/qwen3-embedding-8b` default) |
| **ORM / DB** | SQLAlchemy (async) + asyncpg |
| **Rate Limiting** | slowapi (in-memory, per-IP) |
| **LLM Framework** | LangChain (`langchain-openai`) |

## 📁 Project Structure

```text
carmen-chatbot/
├── backend/                    # Python FastAPI Server
│   ├── main.py                 # Entry point — FastAPI app
│   ├── api/
│   │   └── chat_routes.py      # Chat API endpoints (/api/chat)
│   ├── config/                 # All YAML configuration files
│   │   ├── tuning.yaml         # Tuning parameters (thresholds, TOP_K, RRF_K, temperature…)
│   │   ├── prompts.yaml        # Externalized LLM prompts
│   │   ├── intents.yaml        # Intent examples & canned responses
│   │   └── path_rules.yaml     # RAG path boosting rules
│   ├── core/                   # Infrastructure & cross-cutting concerns
│   │   ├── config.py           # Environment & settings loader
│   │   ├── database.py         # SQLAlchemy async engine (PostgreSQL)
│   │   ├── schemas.py          # Pydantic request/response models
│   │   ├── budget.py           # Daily request cap (in-memory, resets midnight)
│   │   ├── rate_limit.py       # slowapi limiter + IP extraction
│   │   ├── pii.py              # PII masking utilities
│   │   └── logging_config.py   # Structured logging setup
│   └── llm/                    # LLM pipeline & RAG components
│       ├── chat_service.py     # Main AI chat orchestration logic
│       ├── chat_history.py     # LRU memory cache & DB logging
│       ├── retrieval.py        # Hybrid search (pgvector + FTS + RRF)
│       ├── intent_router.py    # 3-stage intent detection pipeline
│       ├── llm_client.py       # LLM creation, retry, fallback, token utils
│       ├── prompt_builder.py   # System + history + context prompt assembly
│       ├── pricing.py          # OpenRouter pricing sync & cost calc
│       └── prompt.py           # Prompt loader
├── scripts/                    # Diagnostic & admin scripts (run manually)
├── tests/                      # pytest integration tests
├── migrations/                 # Database schema migrations
├── images/                     # Local static images served by backend
├── requirements.txt            # Python dependencies
├── .env.example                # Example environment variables
├── start_server.py             # Interactive LLM configurator & launcher
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **PostgreSQL** with `pgvector` extension
- **OpenRouter API Key**

### 1. Setup Backend

```bash
cd carmen-chatbot

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

### 3. Run and Configure Interactively

The easiest way to start the server and configure your LLM provider is using the interactive script:

```bash
python start_server.py
```

This script fetches available OpenRouter models with fuzzy search and performs a health check before the server starts.

---

## ⚙️ Configuration (.env)

Key variables in `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `LLM_API_KEY` | OpenRouter API Key | `sk-or-v1-...` |
| `LLM_API_BASE` | OpenRouter API base URL | `https://openrouter.ai/api/v1` |
| `LLM_CHAT_MODEL` | Primary chat model ID | `stepfun/step-3.5-flash:free` |
| `LLM_INTENT_MODEL` | Intent detection & rewrite model | `google/gemini-2.5-flash-lite` |
| `LLM_EMBED_MODEL` | Embedding model | `qwen/qwen3-embedding-8b` |
| `LLM_FALLBACK_MODEL` | Fallback model if primary fails (optional) | `` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_SCHEMA` | DB schema(s), comma-separated | `carmen,public` |
| `VECTOR_DIMENSION` | Embedding dimensions (must match DB) | `1536` |
| `CORS_ORIGINS` | Allowed frontend origins (`*` = open) | `https://docs.yourcompany.com` |
| `RATE_LIMIT_PER_MINUTE` | Requests per IP per minute | `20/minute` |
| `DAILY_REQUEST_LIMIT` | Global daily request cap (`0` = off) | `500` |
| `MAX_PROMPT_TOKENS` | Token budget for prompt (excl. output) | `6000` |
| `WIKI_CONTENT_PATH` | Path to source markdown/images | `../carmen_cloud` |
| `PRIVACY_HMAC_SECRET` | **Required** — HMAC secret for hashing user IDs (≥32 chars) | `<random-64-hex>` |
| `GO_BACKEND_URL` | Optional Go backend for chat history logging | `http://localhost:8080` |
| `GO_BACKEND_INTERNAL_API_KEY` | API key for Go backend (if set) | `` |

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/stream` | Stream chat response (SSE/NDJSON) — **Recommended** |
| `POST` | `/api/chat/` | Standard chat response (Invoke) |
| `DELETE` | `/api/chat/clear/{room_id}` | Clear in-memory chat history |
| `GET` | `/api/health` | Health check |
| `GET` | `/images/{path}` | Serve images from Wiki or Local directory |

## 🧠 RAG Pipeline

1. **Intent Detection (3-stage):** Regex fast-track → vector cosine similarity (per-category thresholds) → LLM fallback. Greetings, thanks, out-of-scope, company_info, and capabilities return canned responses immediately. `tech_support` and `confusion` continue to retrieval.
2. **Query Rewriting:** Follow-up questions (e.g., "how to fix it?") are rewritten into standalone search queries using conversation history.
3. **Thai Query Handling:** If ≥15% of non-whitespace chars are Thai Unicode, the query is treated as Thai. Non-Thai queries are first translated to Thai before retrieval. PostgreSQL FTS keyword search is skipped for Thai queries.
4. **Hybrid Search:** Vector search (pgvector cosine, distance < 0.45) + PostgreSQL FTS keyword search, fused with RRF (Reciprocal Rank Fusion, k=60).
5. **Path Boosting:** Rules in `config/path_rules.yaml` add a +0.02 RRF bonus to results from matching paths.
6. **Token Budget:** Context is trimmed to fit `MAX_PROMPT_TOKENS` before prompt assembly.
7. **Externalized Prompts:** System instructions are managed in `config/prompts.yaml`. Tuning parameters (thresholds, TOP_K, RRF_K, temperature) live in `config/tuning.yaml`.

## 📸 Image Support

The system automatically scans the `WIKI_CONTENT_PATH` for images and builds a cache. When the LLM references an image (by filename or path), the frontend can serve it via the `/images/` endpoint, which performs recursive lookups and instant caching.

## 🛡️ Security & Rate Limiting

| Layer | Mechanism |
|-------|-----------|
| Origin validation | Rejects requests not from `CORS_ORIGINS` domain (if not `*`) |
| Rate limiting | `slowapi` — `RATE_LIMIT_PER_MINUTE` per IP (default `20/minute`) |
| Daily budget cap | Global request limit — `DAILY_REQUEST_LIMIT` (resets midnight, `0` = off) |
| Input validation | `text` max 2,000 chars; schema name regex `^[a-z][a-z0-9_]{1,62}$` |
| Prompt injection | Strips XML-like tags (`<context>`, `<history>`, etc.) from user input |
| PII masking | Usernames HMAC-hashed before DB storage via `PRIVACY_HMAC_SECRET` |
