# Database migrations (PostgreSQL + pgvector)

รัน **ครั้งเดียวต่อ DB ใหม่** หลัง container `db` ขึ้นแล้ว (และมี extension/pgvector พร้อมตามไฟล์)

## วิธีแนะนำ: `psql` ใน container `db`

รองรับ PL/pgSQL / `DO $$` / ฟังก์ชันยาว — ปลอดภัยกว่าการรันผ่าน `./server migrate` ของ Go ที่แยกคำสั่งด้วย `;` (อาจตัดคำสั่งผิดกับบางไฟล์)

จาก **root ของ repo** (หลัง `docker compose --env-file .env.docker up -d`):

```bash
# Bash / Git Bash
./scripts/migrate-docker.sh
```

```powershell
# PowerShell (ที่ root ของ repo)
.\scripts\migrate-docker.ps1
```

หรือรันทีละไฟล์ด้วยมือ (ตัวอย่าง user/db ตาม `.env.docker`):

```bash
docker compose --env-file .env.docker exec -T db psql -U postgres -d carmen_db -v ON_ERROR_STOP=1 < backend/migrations/0001_init_documents.sql
```

---

## ลำดับมาตรฐาน — DB ใหม่ (embedding **1536** ตรงกับ `0002` + default ในแอป)

รันตามลำดับนี้:

| ลำดับ | ไฟล์ | หมายเหตุ |
|------|------|----------|
| 1 | `0001_init_documents.sql` | extension `vector`, ตาราง `public.documents` / `document_chunks` |
| 2 | `0002_setup_multi_bu.sql` | schema `carmen` / `inventory`, `business_units`, ฟังก์ชัน `create_bu_tables`, ย้ายข้อมูลจาก `public` |
| 3 | `0003_create_activity_logs.sql` | `activity_logs` |
| 4 | `0004_chat_history.sql` | `chat_history` (vector 1536) |
| 5 | `0005_chat_history_privacy.sql` | hardening + `expires_at` + `purge_expired_chat_history()` |
| 6 | `0007_create_faq.sql` | โครงสร้าง FAQ |

**ไม่ต้องรัน** `0005_vector_4096_qwen.sql` ถ้าเป็น DB ใหม่ที่ได้ 1536 จาก `0002` แล้ว — ไฟล์นี้ใช้เมื่อ **อัปเกรดจาก embedding เดิม 4096 → 1536** (มี DROP/คืนคอลัมน์ — ระวังข้อมูล)

**ทางเลือก — ต้องการ vector 2000** (ให้สอดคล้องกับ `VECTOR_DIMENSION=2000` / migration `0006`):

- รัน `0006_vector_2000.sql` **หลัง** `0005_chat_history_privacy.sql` และ **ก่อน** seed/index จริงจัง
- ฟังก์ชัน `create_bu_tables` ใน `0002` / `0005b_create_bu_tables_1536.sql` ยังเป็น **1536** — ถ้าสร้าง BU ใหม่หลัง `0006` อาจไม่ตรงมิติกับตารางเดิม ควรปรับฟังก์ชันเองหรือใช้ BU ที่มีอยู่แล้วเท่านั้น (ติดตามนโยบายทีม)

| ไฟล์ | เมื่อไหร่ |
|------|----------|
| `0005b_create_bu_tables_1536.sql` | หลัง `0005_vector_4096_qwen.sql` (ตามคอมเมนต์ในไฟล์ 0005_vector) — อัปเดตฟังก์ชัน `create_bu_tables` ให้สอดคล้อง 1536 |
| `0008_clear_faq_carmen.sql` | **ไม่บังคับ** — ลบข้อมูล FAQ ของ BU `carmen` เท่านั้น (เตรียมข้อมูลใหม่) |

---

## วิธีสำรอง: Go binary ใน container `backend`

เหมาะกับไฟล์ที่คำสั่งสั้น ไม่มี `$$` ซับซ้อน:

```bash
docker compose --env-file .env.docker exec backend ./server migrate migrations/0001_init_documents.sql
```

ค่าเริ่มต้นของคำสั่ง `migrate` โดยไม่ระบุ path ชี้ไปที่ `migrations/0004_chat_history.sql` — ควรระบุ path ให้ชัดทุกครั้ง

---

## หลัง migration

- รัน **reindex** ตาม BU ถ้าโปรเจกต์ใช้ (ดู `README` / `cmd/server` ของ backend)
- ตั้ง `OPENROUTER_EMBED_MODEL` / `VECTOR_DIMENSION` ให้ตรงกับมิติในฐานข้อมูล
