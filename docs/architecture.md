# สถาปัตยกรรมระบบ New Carmen (สรุป)

ภาพรวมสั้น ๆ ของส่วนประกอบหลัก:

- Frontend (Next.js): UI สำหรับค้นหา / chat (ยังไม่พัฒนาใน repo นี้)
- Backend (Go + Fiber): REST API, Auth, Document service, Search, Integration กับ Ollama + ChromaDB + Neon(Postgres)
- Wiki.js: ระบบจัดการเนื้อหา Markdown บน VM → ซิงก์ขึ้น GitHub
- N8N (แผน): Orchestration สำหรับสร้าง embedding และอัปเดต Vector DB
- ChromaDB: Vector store สำหรับ semantic search
- Ollama: LLM (chat + embedding) ที่ backend ใช้เรียกผ่าน HTTP API
- Neon (Postgres): metadata (users, documents, versions, permissions)

Data / control flow (ย่อ):

1. ผู้ใช้แก้เอกสารบน Wiki.js → Wiki.js push ขึ้น GitHub
2. GitHub push → (Webhook) → Backend `/webhook/github` หรือ N8N trigger
3. Backend (หรือ N8N) ดึงไฟล์ Markdown ใน repo → สร้าง embedding ผ่าน Ollama → เก็บ chunk + embedding ลงฐานข้อมูล (`document_chunks`)
4. ผู้ใช้ค้นหา → Frontend เรียก Backend API → Backend query vector DB / Postgres + เรียก Ollama เพื่อทำ RAG/สรุป

ตำแหน่งไฟล์สำคัญ (backend):

- Route registration: `backend/internal/router/*.go`
- Wiki service: `backend/internal/services/wiki_service.go`
- Indexing: `backend/internal/services/indexing_service.go`
- Ollama client: `backend/pkg/ollama/client.go`
- Database connect/migrate: `backend/internal/database/database.go`

ข้อสังเกตสำคัญ:

- โฟลเดอร์ `backend/migrations` ปัจจุบันไม่มีไฟล์ migrations (มี .gitkeep) — สถานะ schema ต้องตรวจสอบ/สร้างจาก SQL หรือ GORM models
- Embedding ถูกเก็บเป็น Postgres `vector` (โค้ดทำ `?::vector`) — ต้องติดตั้ง `vector` extension (เช่น `pgvector`) หรือ DB ที่รองรับชนิด `vector` (Neon config)
