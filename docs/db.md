# ฐานข้อมูล (สรุป & ข้อสังเกต)

เทคโนโลยี: Neon (PostgreSQL) ตาม `PROJECT_OVERVIEW.md` — backend ใช้ GORM

ตารางที่โค้ดอ้างถึง (จากการอ่านโค้ด):

- `documents` (ใช้ใน `indexing_service.go` และ `documents_handler.go`)
  - คอลัมน์ที่คาดว่ามี: `id`, `path`, `title`, `source`, `created_at`, `updated_at`
  - โค้ดใช้ `INSERT ... ON CONFLICT (path) DO UPDATE` เพื่อ upsert โดยคืน `id`

- `document_chunks`
  - คอลัมน์ที่คาดว่ามี: `id`, `document_id`, `chunk_index`, `content`, `embedding`, `created_at`
  - `embedding` ถูกบันทึกเป็นชนิด `vector` (โค้ดเขียน `?::vector`) — ต้องเปิด extension/รองรับชนิดนี้ ใน Postgres โดยปกติใช้ `pgvector` หรือ DB ที่มีชนิด vector ในตัว

ตาราง metadata อื่น ๆ (กล่าวถึงใน docs แต่ยังไม่พบ migrations):

- `users`, `roles`, `user_roles`, `document_versions`, `document_permissions` — ต้องตรวจสอบ schema เพิ่มเติมหรือสร้าง migrations

สถานะ migrations:

- โฟลเดอร์ `backend/migrations` ปัจจุบันไม่มีไฟล์ migration (เพียง `.gitkeep`) — น่าจะต้องเพิ่มไฟล์ migration ของแต่ละตารางหรือให้ GORM AutoMigrate ทำงาน

คำแนะนำปฏิบัติการทันที:

1. ตรวจสอบฐานข้อมูลจริง (Neon) ว่ามี extension `vector`/`pgvector` ติดตั้งหรือไม่
2. ถ้าไม่มี migration scripts ให้เพิ่ม SQL migration ตัวอย่าง (หรือใช้ GORM model + AutoMigrate) เพื่อสร้างตาราง `documents` และ `document_chunks` อย่างปลอดภัย
3. ตัวอย่าง SQL เบื้องต้น (ให้ปรับตาม needs):

```sql
CREATE TABLE documents (
  id bigserial PRIMARY KEY,
  path text UNIQUE NOT NULL,
  title text,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ถ้าใช้ pgvector
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
  id bigserial PRIMARY KEY,
  document_id bigint REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text,
  embedding vector(1536), -- ขนาดขึ้นกับ model
  created_at timestamptz DEFAULT now()
);
```

หมายเหตุ: ขนาด `vector(1536)` เป็นตัวอย่าง — ปรับให้ตรงกับ embedding dimension ของโมเดลที่ใช้งาน
