---
title: QA_TESTING
description: 
published: true
date: 2026-03-20T09:28:18.199Z
tags: 
editor: markdown
dateCreated: 2026-03-19T08:02:10.415Z
---

# QA Testing Guide

## Backend (Go)

### Run Tests
```bash
cd backend
make test
# or
go test ./tests/... -v
```

### Test Coverage
```bash
cd backend
make test-coverage
# Opens coverage.html in browser
```

### Test Structure (backend/tests/)
| Folder | Tests | Description |
|--------|-------|-------------|
| `tests/nlp/` | Preprocess, ExpandQuery | NLP preprocessing, synonym expansion |
| `tests/router/` | Health, Wiki API | Health check, Wiki validation (empty slug/path, empty search) |
| `tests/security/` | ValidateSchema | Schema/BU validation (SQL injection prevention) |

### Adding New Tests
- Add new `*_test.go` under `tests/<domain>/` (e.g. `tests/nlp/`, `tests/router/`)
- Use external test package (e.g. `package nlptest`) and import the package under test

---

## Python Chatbot

### Run Tests
```bash
cd carmen-chatbot
pip install pytest  # optional, uses unittest by default
python backend/llm/test_retrieval.py -v
# or: pytest backend/llm/test_retrieval.py -v
```

**Note:** On Windows, if you see `UnicodeEncodeError`, set `PYTHONIOENCODING=utf-8` or run in a terminal with UTF-8 support.

### Test Structure
| File | Tests | Description |
|------|-------|-------------|
| `backend/llm/test_retrieval.py` | SAFE_SCHEMA_PATTERN, build_path_boost | SQL injection prevention, path boost logic |

---

## Frontend (Next.js)

### Setup (optional)
```bash
cd frontend/user
npm install -D vitest @testing-library/react jsdom
```

Add to `package.json`:
```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

---

## E2E / Integration (Manual QA)

### Smoke Test Checklist
1. **Health**: `GET http://localhost:8080/health` → 200
2. **Wiki List**: `GET http://localhost:8080/api/wiki/list?bu=carmen` → 200
3. **Wiki Categories**: `GET http://localhost:8080/api/wiki/categories?bu=carmen` → 200
4. **Wiki Search**: `GET http://localhost:8080/api/wiki/search?q=invoice&bu=carmen` → 200
5. **Frontend**: Open `http://localhost:3000` → loads
6. **Chat**: Open chat, send message → response

### CI/CD
Add to GitHub Actions or similar:
```yaml
- name: Backend tests
  run: cd backend && go test ./tests/...
- name: Python tests
  run: cd carmen-chatbot && pytest backend/llm/ -v
```
