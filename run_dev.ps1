Write-Host "Starting Carmen Development Services..." -ForegroundColor Cyan

# 1. Go Backend (serves the native RAG chatbot at /api/chat/*)
Write-Host "Starting Go Backend (Port 8080)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- Go Backend ---' -ForegroundColor Yellow; cd backend; go run cmd/server/main.go" -WindowStyle Normal

# 2. Frontend (Next.js — port 3301, set in frontend-next/package.json dev script)
Write-Host "Starting Next.js Frontend (Port 3301)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- Next.js Frontend ---' -ForegroundColor Yellow; cd frontend-next; bun run dev" -WindowStyle Normal

# 3. Frontend (React SPA — Vite, port 3302). Points VITE_API_BASE at the local backend.
Write-Host "Starting React SPA Frontend (Vite, Port 3302)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- React SPA Frontend ---' -ForegroundColor Yellow; cd frontend-react; `$env:VITE_API_BASE='http://localhost:8080'; bun run dev" -WindowStyle Normal

Write-Host ""
Write-Host "All services are starting in separate windows." -ForegroundColor Green
Write-Host "   - Go Backend:        http://localhost:8080"
Write-Host "   - Next.js Frontend:  http://localhost:3301"
Write-Host "   - React SPA (Vite):  http://localhost:3302"
