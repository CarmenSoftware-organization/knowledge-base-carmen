# New Carmen Backend

Backend API สำหรับระบบ New Carmen Web ที่ใช้ Go Fiber framework

## โครงสร้างโปรเจค

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # Entry point
├── internal/
│   ├── config/              # Configuration management
│   ├── database/            # Database connection & migrations
│   ├── models/              # Data models
│   ├── storage/             # Data access layer
│   ├── services/            # Business logic layer
│   │   ├── auth/           # Authentication service
│   │   ├── document/       # Document management
│   │   ├── search/         # Search service
│   │   └── ai/             # AI/LLM service
│   ├── handlers/           # HTTP handlers
│   ├── middleware/         # HTTP middleware
│   └── utils/              # Utilities
├── pkg/
│   ├── ollama/             # Ollama client
│   ├── chromadb/           # ChromaDB client
│   └── github/             # GitHub integration
├── migrations/             # Database migrations
├── .env.example
└── go.mod
```

## Features

- 🔐 Authentication & Authorization (Role-based)
- 📄 Document Management
- 🔍 AI-Powered Semantic Search
- 🤖 Ollama Integration
- 🗄️ ChromaDB Vector Database
- 📚 GitHub Integration (for wiki.js content)
- 🐘 PostgreSQL Database

## Setup

1. Copy `.env.example` to `.env` and configure
2. Run migrations: `make migrate-up`
3. Start server: `go run cmd/server/main.go`

## Development Plan

- Week 1: Foundation & Content Management Flow
- Week 2: Indexing & Semantic Search
- Week 3: AI-Assisted Search Intelligence
- Week 4: UX, Performance & Delivery
