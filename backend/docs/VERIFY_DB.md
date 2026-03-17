# วิธีตรวจสอบว่าข้อมูลเข้า DB จริง

## 1. Activity Logs (บันทึกกิจกรรม)

### API
```bash
# ดู logs ทั้งหมด (default bu=carmen)
curl "http://localhost:8080/api/activity/list?bu=carmen&limit=20"

# ดู summary รายเดือน
curl "http://localhost:8080/api/activity/summary?bu=carmen&period=monthly&year=2025"
```

### SQL (ตรง DB)
```sql
SELECT id, bu_id, user_id, action, category, timestamp 
FROM public.activity_logs 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## 2. Chat History (ประวัติแชท)

### API
```bash
# 1) ถามแชทก่อน (จะบันทึกลง chat_history)
curl -X POST "http://localhost:8080/api/chat/ask?bu=carmen" \
  -H "Content-Type: application/json" \
  -d '{"question":"GL คืออะไร"}'

# 2) ดูประวัติที่บันทึกไว้
curl "http://localhost:8080/api/chat/history/list?bu=carmen&limit=10"
```

### SQL (ตรง DB)
```sql
SELECT id, bu_id, user_id, LEFT(question, 50) AS question, LEFT(answer, 80) AS answer, created_at 
FROM public.chat_history 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 3. Documents (เอกสารที่ index แล้ว)

### API
```bash
curl "http://localhost:8080/api/documents?bu=carmen"
```

### SQL
```sql
SELECT COUNT(*) FROM carmen.documents;
SELECT COUNT(*) FROM carmen.document_chunks;
```

---

## 4. Log ใน Terminal

เมื่อรัน `air` หรือ `go run`:
- ถ้า **Save history ล้มเหลว** จะเห็น `[chat] save history failed: ...`
- ถ้า **ไม่มี log นี้** แปลว่าบันทึกสำเร็จ

---

## สรุป Flow การตรวจสอบ

1. **ถามแชท** → POST /api/chat/ask
2. **ดูประวัติ** → GET /api/chat/history/list?bu=carmen
3. **ดู activity** → GET /api/activity/list?bu=carmen
4. ถ้าได้ข้อมูลกลับมา = เก็บ DB ได้จริง

---

## 5. Embedding Dimension (documents เข้า แต่ document_chunks ไม่เข้า)

### ตรวจสอบ
```bash
go run scripts/check_embed_dim.go
```

### สิ่งที่ต้องตรงกัน
| รายการ | ค่าที่ใช้ |
|--------|-----------|
| **Code** | `utils.EmbeddingDim` = 1536 |
| **DB schema** | `carmen.document_chunks.embedding` = VECTOR(1536) |
| **Ollama model** | qwen3-embedding → 4096 (truncate เป็น 1536) |

### หมายเหตุ
- pgvector IVFFlat limit = 2000 dimensions
- qwen3-embedding ส่ง 4096 → โค้ด truncate เป็น 1536
