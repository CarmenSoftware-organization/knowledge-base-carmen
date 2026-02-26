# Carmen Chatbot

AI-powered chatbot for **Carmen Enterprise Software** — uses RAG (Retrieval-Augmented Generation) with PostgreSQL/pgvector for knowledge retrieval and OpenRouter LLM API for response generation.

## 📁 Project Structure

```
carmen-chatbot/
├── backend/                    # Python FastAPI Server
│   ├── main.py                 # Entry point — FastAPI app
│   ├── config.py               # Environment & settings
│   ├── database.py             # SQLAlchemy engine (PostgreSQL)
│   ├── schemas.py              # Pydantic request/response models
│   ├── routers/
│   │   └── chat.py             # Chat API endpoints (/api/chat)
│   └── services/
│       ├── llm_service.py      # LLM integration (OpenRouter/Ollama)
│       └── retrieval_service.py # RAG search (pgvector embeddings)
├── carmen-chatbot-widget/      # Embeddable frontend widget (Vite)
│   ├── src/                    # Widget source code
│   ├── dist/                   # Built widget (carmen-widget.js)
│   └── README.md               # Widget documentation & usage
├── requirements.txt            # Python dependencies
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** (for widget development only)
- **PostgreSQL** with pgvector extension (shared database)
- **Ollama** running locally (for embeddings)

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

Create a `.env` file in the **parent directory** (project root):

```env
# LLM API
OPENROUTER_API_KEY=your-openrouter-api-key

# Ollama (for embeddings)
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text:latest

# PostgreSQL (pgvector)
PG_HOST=your-db-host
PG_PORT=5432
PG_USER=your-db-user
PG_PASSWORD=your-db-password
PG_NAME=your-db-name
PG_SSLMODE=require
```

### 3. Run the Server

```bash
# From the carmen-chatbot directory
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`

### 4. Widget Development (Optional)

```bash
cd carmen-chatbot-widget
npm install
npm run dev     # Dev server
npm run build   # Build carmen-widget.js
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/stream` | Stream chat response (SSE/NDJSON) |
| `POST` | `/api/chat/` | Standard chat response (invoke) |
| `DELETE` | `/api/chat/clear/{room_id}` | Clear in-memory chat history |
| `GET` | `/health` | Health check |

## 🤖 Widget Usage

See [carmen-chatbot-widget/README.md](carmen-chatbot-widget/README.md) for full widget documentation.

Quick start:

```html
<script src="carmen-widget.js"></script>
<script>
  new CarmenBot({
    apiBase: "http://localhost:8000",
    bu: "your-business-unit",
    user: "username"
  });
</script>
```
