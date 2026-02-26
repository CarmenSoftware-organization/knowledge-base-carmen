# Carmen Startup Guide

This guide explains how to run the newly consolidated Carmen application stack. The system consists of three main components:

1. **Go Backend** (Port `8080`)
2. **Python Chatbot** (Port `8000`)
3. **Next.js Frontend** (Port `3000`)

## Prerequisites

1. **Go** installed (for the Go backend)
2. **Node.js** and **npm** installed (for the frontend)
3. **Python 3** installed (for the Chatbot backend)
4. Database instances running and accessible (PostgreSQL for search, MySQL for chatbot/auth, as defined in `.env`).
5. Ollama currently running with `gemma3:1b` and `nomic-embed-text` models (or access to the remote Ollama server).

## Environment Setup

All configuration has been moved to a single `.env` file at the root of the project.

1. Copy `.env.example` to `.env` (if applicable) or create a `.env` file in the root folder.
2. Ensure you have your environment variables properly filled in (e.g. `DB_URL`, `OPENROUTER_API_KEY`, etc). Both the Go and Python services will read from this root `.env` file.

## Running the Application Locally (Windows)

A convenience script `run_dev.ps1` has been provided to start all three services simultaneously.

1. Open **PowerShell** as an Administrator or standard user with execution bypass.
2. Navigate to the project root:

3. Execute the startup script:

    ```powershell
    .\run_dev.ps1
    ```

    *(If script execution is disabled, you can run `powershell -ExecutionPolicy Bypass -File .\run_dev.ps1`)*

This script will open three separate PowerShell windows, each running one of the services.

### Manual Startup

If you prefer to start them manually or are on a different OS:

**1. Go Backend**

```bash
cd backend
go run cmd/server/main.go
```

Runs on <http://localhost:8080>

**2. Python Chatbot**

```bash
cd carmen-chatbot
# Ensure your virtual environment is activated
# Windows
.\.venv\Scripts\activate
# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

Runs on <http://localhost:8000>
*Swagger UI docs available at <http://localhost:8000/docs>*

**3. Next.js Frontend**

```bash
cd frontend/user
npm install
npm run dev
```

Runs on <http://localhost:3000>

## Notes

- The frontend interacts with the Go Backend (usually through `/api/*` proxies).
- The Chatbot component powers the actual AI streaming functionality. It streams SSE to the Go backend, which pipes it to the Frontend.
- If you notice CORS errors or connectivity issues, ensure all three services are fully running on their designated ports.
