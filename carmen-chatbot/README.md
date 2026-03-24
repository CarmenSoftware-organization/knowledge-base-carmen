---
title: README
description: 
published: true
date: 2026-03-19T08:33:42.564Z
tags: 
editor: markdown
dateCreated: 2026-03-19T08:00:35.495Z
---

# Carmen Chatbot

AI-powered chatbot for **Carmen Enterprise Software** — uses RAG (Retrieval-Augmented Generation) with PostgreSQL/pgvector for knowledge retrieval and OpenRouter LLM API for response generation.

## 📁 Project Structure

```text
carmen-chatbot/
├── backend/                    # Python FastAPI Server
│   ├── main.py                 # Entry point — FastAPI app
│   ├── api/
│   │   └── chat_routes.py      # Chat API endpoints (/api/chat)
│   ├── core/
│   │   ├── config.py           # Environment & settings
│   │   ├── database.py         # SQLAlchemy engine (PostgreSQL)
│   │   ├── path_rules.yaml     # RAG path boosting rules
│   │   ├── prompts.yaml        # Externalized LLM prompts
│   │   └── schemas.py          # Pydantic request/response models
│   └── llm/                    # LLM-related services & RAG components
│       ├── chat_history.py     # Memory cache & chat management
│       ├── chat_service.py     # Main AI chat orchestration logic
│       ├── prompt.py           # Prompt loader (loads from yaml/json)
│       └── retrieval.py        # RAG search (pgvector embeddings)
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
| `OPENROUTER_API_KEY` | Your OpenRouter API Key | `sk-or-v1-...` |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL | `https://openrouter.ai/api/v1` |
| `OPENROUTER_CHAT_MODEL` | Chat model ID | `stepfun/step-3.5-flash:free` |
| `OPENROUTER_INTENT_MODEL` | Intent detection model | `google/gemini-2.5-flash-lite` |
| `OPENROUTER_EMBED_MODEL` | Embedding model | `qwen/qwen3-embedding-8b` |
| `DB_HOST` | PostgreSQL Host | `localhost` |
| `VECTOR_DIMENSION` | Embedding dimensions (must match DB) | `2000` |
| `WIKI_CONTENT_PATH` | Path to source markdown/images | `../carmen_cloud` |
| `CORS_ORIGINS` | Allowed frontend origins | `https://docs.yourcompany.com` |
| `PRIVACY_HMAC_SECRET` | Secret for hashing user IDs | `<random string>` |

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/stream` | Stream chat response (SSE/NDJSON) — **Recommended** |
| `POST` | `/api/chat/` | Standard chat response (Invoke) |
| `DELETE` | `/api/chat/clear/{room_id}` | Clear in-memory chat history |
| `GET` | `/api/health` | Health check |
| `GET` | `/images/{path}` | Serve images from Wiki or Local directory |

## 🧠 RAG Pipeline
 
1.  **Intent Detection:** Regex → vector similarity → LLM fallback to detect greetings, out-of-scope, and tech support queries.
2.  **Query Rewriting:** Converts follow-up questions (e.g., "how to fix it?") into standalone search queries using conversation context.
3.  **Hybrid Search:** Vector search (pgvector cosine) + PostgreSQL full-text search, fused with RRF (Reciprocal Rank Fusion).
4.  **Path Boosting:** Prioritizes results based on folder paths defined in `core/path_rules.yaml`.
5.  **Externalized Prompts:** System instructions are managed in `core/prompts.yaml` for easy updates without code changes.

## 📸 Image Support

The system automatically scans the `WIKI_CONTENT_PATH` for images and builds a cache. When the LLM references an image (by filename or path), the frontend can serve it via the `/images/` endpoint, which performs recursive lookups and instant caching.

## 🛡️ Rate Limiting

API protection is handled by `slowapi`. You can configure the limit via `RATE_LIMIT_PER_MINUTE` in your `.env` (default is `20/minute`).
