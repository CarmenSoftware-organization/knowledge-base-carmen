# Design — Squash DB migrations into a single canonical schema file

**วันที่:** 2026-06-22
**สถานะ:** อนุมัติดีไซน์แล้ว (รอ review spec ก่อนทำ implementation plan)

## เป้าหมาย (Goal)

ยุบ migration 14 ไฟล์ `.sql` (`backend/migrations/0001…0012`, โดย `0005` มี 3 ตัว) ให้เหลือ **ไฟล์เดียว** ที่อธิบาย *end-state schema* ของฐานข้อมูล (multi-BU, pgvector) สำหรับ **DB ใหม่** ที่ embedding dimension = **2000** (ตรงกับ production `render.yaml`), idempotent, รันด้วย `psql` ได้ทั้งไฟล์ในครั้งเดียว

## บริบทปัจจุบัน (ที่สำรวจมา)

- `backend/migrations/` มี 14 ไฟล์ `.sql` (รวม README) — ลำดับ + dimension variants อธิบายใน `migrations/README.md`
- `scripts/migrate-docker.sh` (+ `.ps1`) รันไฟล์ตาม **ลำดับ explicit** และปัจจุบันรัน **1536-path** เป็น default (0001→0002→0003→0004→0005_privacy→0007→0011→0012) โดย `0006_vector_2000` เป็น "optional" — ไม่สอดคล้องกับ prod ที่ใช้ 2000
- **แอปไม่อ้าง `public.documents` / `public.document_chunks` เลย** — `internal/services/retrieval_service.go` ใช้ `%s.documents` / `%s.document_chunks` (schema-qualified per-BU) เท่านั้น → legacy public tables จาก `0001` ไม่ถูกใช้
- ฟังก์ชัน `create_bu_tables(schema)` ใน `0002` สร้างตารางที่ `VECTOR(1536)`; `0006_vector_2000` มา `ALTER … TYPE vector(2000)` ทีหลัง (แต่ไม่แก้ฟังก์ชัน)
- `0002` มี `DO $$ … $$` (PL/pgSQL) → ต้องรันด้วย `psql` ไม่ใช่ Go splitter
- Go binary `./server migrate <path>` รันไฟล์ทีละไฟล์ (default path ชี้ `0004` — README บอกให้ระบุ path เสมอ)

### การจัดกลุ่มไฟล์เดิม

| กลุ่ม | ไฟล์ | การจัดการในไฟล์ squash |
|------|------|----------|
| Always-run schema | 0001, 0002, 0003, 0004, 0005_privacy, 0007, 0011, 0012 | fold เข้า (end-state, 2000-dim) |
| Dimension variant | 0005_vector_4096_qwen (destructive 4096→1536), 0006_vector_2000, 0005b_create_bu_tables_1536 | **ตัด** — สร้างที่ 2000 ตรงๆ ตั้งแต่ต้น |
| Optional/legacy | 0008_clear_faq_carmen (data clear), 0009_blueledgers_bu, 0010_inventory_to_blueledgers (legacy) | 0009 fold (สร้าง blueledgers ในหลัก); 0008/0010 **ตัด** |
| One-time data ops | 0002 public→carmen migrate, 0005 anonymize + expires_at backfill | **ตัด** (ไม่มีข้อมูลใน DB ใหม่) |

## ผลลัพธ์ (Deliverable)

**ไฟล์ใหม่:** `backend/migrations/0001_init_schema.sql` — แทนทั้ง 14 ไฟล์ `.sql` เดิม (ไฟล์เดิมถูกลบ)

ทุก statement เป็น idempotent: `CREATE … IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `INSERT … ON CONFLICT DO NOTHING`, `DROP TRIGGER IF EXISTS` ก่อน `CREATE TRIGGER`

### โครงสร้างที่ไฟล์สร้าง (end-state, 2000-dim)

1. **Extensions:** `CREATE EXTENSION IF NOT EXISTS vector;` + `pgcrypto;`
2. **`public.business_units`** (id, name, slug, description, created_at, updated_at) + seed `carmen`, `blueledgers` (`ON CONFLICT (slug) DO NOTHING`)
3. **Schemas:** `carmen`, `blueledgers`
4. **`create_bu_tables(schema_name TEXT)`** (PL/pgSQL, `CREATE OR REPLACE`) — สร้างใน schema ที่รับเข้ามา:
   - `documents` (id, path UNIQUE, title, source, created_at, updated_at)
   - `document_chunks` (id, document_id FK→documents ON DELETE CASCADE, chunk_index, content, **embedding VECTOR(2000)**, created_at)
   - `idx_document_chunks_embedding` — `ivfflat (embedding vector_l2_ops) WITH (lists=100)`
   - `document_chunks_content_fts_idx` — `gin (to_tsvector('simple', content))`
   - **(ใหม่)** ฝัง 2 index ในฟังก์ชัน → BU ที่ provision ภายหลังได้ index อัตโนมัติ
5. **เรียกฟังก์ชัน:** `SELECT create_bu_tables('carmen'); SELECT create_bu_tables('blueledgers');`
6. **`public.chat_history`** (id, bu_id FK→business_units ON DELETE CASCADE, user_id, question, answer, sources JSONB, **question_embedding VECTOR(2000)**, created_at, `expires_at TIMESTAMPTZ`, `metrics JSONB DEFAULT '{}'`)
   - indexes: bu_id, user_id, created_at, expires_at, `ivfflat (question_embedding vector_l2_ops) WITH (lists=100)`
   - `chat_history_set_expires_at()` trigger fn + `trg_chat_history_expires_at` (BEFORE INSERT/UPDATE, ตั้ง expires_at = created_at + 90 days)
   - `purge_expired_chat_history()` → integer (ลบ row หมดอายุ)
7. **`public.activity_logs`** (id, bu_id FK→business_units ON DELETE SET NULL, user_id, action, category, details JSONB, timestamp, created_at) + indexes (bu_id, timestamp, category)
8. **FAQ (public):** `faq_modules`, `faq_submodules`, `faq_categories`, `faq_entries`, `faq_related` (ตาม `0007` ทุกประการ — UNIQUE/FK/defaults คงเดิม)

### สิ่งที่ตัดออก (พร้อมเหตุผล)

- `public.documents` / `public.document_chunks` (legacy single-tenant จาก `0001`) — แอปไม่ใช้ (ยืนยันด้วย grep retrieval_service)
- public→carmen data migration (`0002` ข้อ 7) + chat anonymize/expires backfill (`0005` ข้อ 1-2) — เป็น one-time data op สำหรับ DB ที่มีข้อมูลเดิม ไม่เกี่ยวกับ DB ใหม่
- `0005_vector_4096_qwen.sql` (DROP/recreate destructive), `0010` (legacy inventory), `0008` (data clear) — ไม่ใช่ schema ของ DB ใหม่

## กระทบไฟล์อื่น

- **`scripts/migrate-docker.sh`** — แทน list 8 บรรทัด `migrate …` ด้วย `migrate backend/migrations/0001_init_schema.sql` บรรทัดเดียว + อัปเดตข้อความท้าย (2000-dim, single file)
- **`scripts/migrate-docker.ps1`** — แก้แบบเดียวกัน
- **`backend/migrations/README.md`** — เขียนส่วน "ลำดับมาตรฐาน" ใหม่: รันไฟล์เดียว, ระบุ dim=2000, ลบตาราง variant/optional/legacy เดิม; คงส่วน psql/Render/Fly/Vercel ที่ยังถูกต้อง

## Verification

- [ ] รัน `0001_init_schema.sql` บน Postgres+pgvector สด (`pgvector/pgvector:pg16` ผ่าน docker) ด้วย `psql -v ON_ERROR_STOP=1` → สำเร็จไม่มี error
- [ ] รันซ้ำไฟล์เดิมอีกครั้ง → สำเร็จ (idempotent, ไม่มี error)
- [ ] ตรวจ object: `public.business_units` (2 rows), schemas `carmen`/`blueledgers` มี `documents`+`document_chunks`, `public.chat_history`/`activity_logs`/`faq_*`
- [ ] ตรวจ dimension = 2000: `carmen.document_chunks.embedding`, `blueledgers.document_chunks.embedding`, `public.chat_history.question_embedding` (ผ่าน `\d` / `pg_attribute` + `atttypmod`)
- [ ] ตรวจ index มีครบ: ivfflat embedding (2 BU + chat), GIN FTS (2 BU), btree (chat/activity)
- [ ] `SELECT create_bu_tables('test_bu');` → สร้าง test_bu.documents/document_chunks + ทั้ง 2 index ที่ 2000 ได้
- [ ] backend boot ได้ (`go build ./...` + ชุดทดสอบที่ไม่ติด DB) — ไม่กระทบโค้ด Go
- [ ] `grep` ยืนยันไม่มี ref ไปไฟล์ migration เก่าใน scripts/docs ที่ค้าง

## Out of scope

- ไม่แตะโค้ด Go (`./server migrate`, retrieval, indexer) — schema เหมือนเดิมในมุมแอป
- ไม่ migrate/แตะ production DB ที่มีอยู่ (squash = สำหรับ DB ใหม่; prod เดิม migrate แล้วและ dim=2000 ตรงกัน)
- ไม่เพิ่ม migration framework / schema_migrations tracking (ยังรันด้วย psql ครั้งเดียวตามเดิม)
- ไม่ทำ down/rollback migration
