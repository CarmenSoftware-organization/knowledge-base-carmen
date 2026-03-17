# ลบข้อมูลใน DB และ Rebuild ใหม่

## วิธีที่ 1: ใช้ CLI (แนะนำ)

### ลบ index (documents + chunks) แล้ว reindex ใหม่

```bash
cd backend

# 1. ลบข้อมูลเอกสารและ chunks ของ BU นั้น
go run cmd/server/main.go reset index carmen

# 2. Reindex ใหม่จาก Wiki content
go run cmd/server/main.go reindex carmen
```

สำหรับ BU อื่น เช่น `inventory`:

```bash
go run cmd/server/main.go reset index inventory
go run cmd/server/main.go reindex inventory
```

### ลบข้อมูลใน public schema (activity_logs, chat_history)

```bash
go run cmd/server/main.go reset all
```

**หมายเหตุ:** `reset all` จะ truncate ตารางใน public ทั้งหมด รวมถึง `business_units`  
ถ้าต้องการ business_units กลับมา ให้รัน migration 0002 ใหม่:

```bash
go run cmd/server/main.go migrate migrations/0002_setup_multi_bu.sql
```

### Migration สำหรับ qwen3-embedding (VECTOR 1536)

```bash
go run cmd/server/main.go migrate migrations/0005_vector_4096_qwen.sql
```

---

## วิธีที่ 2: ใช้ API (จาก Frontend)

1. ไปที่หน้า **Activity Logs**
2. กดปุ่ม **Reindex ข้อมูล (AI Search)**  
   → Backend จะ reindex โดยไม่ลบข้อมูลเก่า (upsert)

ถ้าต้องการลบก่อน reindex ต้องใช้ CLI ด้านบน

---

## วิธีที่ 3: รัน SQL เอง (Beekeeper / psql)

```sql
-- ลบ documents + chunks ของ carmen เท่านั้น
TRUNCATE TABLE carmen.documents RESTART IDENTITY CASCADE;

-- จากนั้นรัน reindex ผ่าน CLI
-- go run cmd/server/main.go reindex carmen
```

```sql
-- ลบ activity_logs และ chat_history (เก็บ business_units)
TRUNCATE TABLE public.activity_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.chat_history RESTART IDENTITY CASCADE;
```

---

## สรุปคำสั่ง

| คำสั่ง | ความหมาย |
|--------|----------|
| `reset index <bu>` | ลบ documents + document_chunks ของ BU นั้น |
| `reset all` | ลบทุกตารางใน public (activity_logs, chat_history, business_units) |
| `reindex <bu>` | ดึงเนื้อหาจาก Wiki → สร้าง embedding → เก็บลง DB |
