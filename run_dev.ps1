Write-Host "Starting Carmen Development Services..." -ForegroundColor Cyan

# 1. Go Backend
Write-Host "Starting Go Backend (Port 8080)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- Go Backend ---' -ForegroundColor Yellow; cd backend; go run cmd/server/main.go" -WindowStyle Normal

# 2. Python Chatbot
Write-Host "Starting Python Chatbot (Port 8000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- Python Chatbot ---' -ForegroundColor Yellow; cd carmen-chatbot; .\.venv\Scripts\python.exe start_server.py" -WindowStyle Normal

# 3. Frontend (Next.js)
Write-Host "Starting Frontend (Port 3000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- Next.js Frontend ---' -ForegroundColor Yellow; cd frontend\user; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "All services are starting in separate windows." -ForegroundColor Green
Write-Host "   - Go Backend: http://localhost:8080"
Write-Host "   - Python Chatbot: http://localhost:8000/docs"
Write-Host "   - Frontend: http://localhost:3000"
