# จาก carmen-cloud → Vector (ChromaDB) + แสดงที่ Frontend

## สถานะตอนนี้

| ที่เก็บ | ใช้ทำอะไร | ข้อมูลจาก carmen-cloud ไปถึงไหม |
|--------|-----------|----------------------------------|
| **ChromaDB** | Vector search, RAG (chat) | ไปแล้ว — เวลา index จาก GitHub จะ Add เข้า ChromaDB |
| **PostgreSQL** | เก็บ Document, Category ให้ API แสดงรายการ/บทความให้ frontend | ยังไม่ไป — ตอน index ไม่ได้เขียนลง DB |

ดังนั้นตอนนี้: **ค้นหา (vector) ได้จาก ChromaDB แต่ frontend แสดงบทความ/หมวดจาก DB → ถ้าไม่เขียนลง DB ฝั่ง frontend จะไม่มีรายการบทความให้แสดง**

---

## Flow ที่ควรเป็น (ให้ทั้ง search และแสดงที่ frontend)

```
carmen-cloud (เช่น Wiki → GitHub repo Markdown)
        │
        ▼
   [Trigger: Webhook หรือ POST /api/indexing/load-github]
        │
        ├──► ChromaDB    (embed + เก็บ vector) → ใช้ค้นหา + chat
        │
        └──► PostgreSQL (Document, Category)   → ใช้ให้ GET /api/articles, /api/categories แสดงที่ frontend
```

- **ChromaDB**: ไว้ค้นหาแบบ semantic + ตอบ chat (มีอยู่แล้วใน IndexingService)
- **PostgreSQL**: ไว้ให้ API บอก frontend ว่ามีหมวดอะไร บทความอะไร แล้วดึงเนื้อหาบทความมาแสดง (ต้องเพิ่มขั้นตอนเวลา index)

---

## สิ่งที่ต้องทำใน backend (เมื่อเปิด DB แล้ว)

ตอนนี้ `IndexingService.ProcessGitHubPush` และ `LoadContentFromGitHub` ทำแค่:

1. โหลดไฟล์ .md จาก GitHub
2. ใส่ ChromaDB (path, type ใน metadata)

**ที่ขาด:** ไม่มีขั้นตอน **เขียนลง PostgreSQL** (Document / Category)

แนวทางเพิ่ม:

1. **เวลา index แต่ละไฟล์จาก carmen-cloud (GitHub):**
   - ใช้ path หรือโฟลเดอร์เป็นหมวด (หรือ map กับ Category ที่มีอยู่)
   - สร้างหรืออัปเดต **Category** (ถ้ายังไม่มี)
   - สร้างหรืออัปเดต **Document** (title จากชื่อไฟล์หรือ frontmatter, content จาก markdown, category_id, is_public = true)
   - เก็บ **DocumentVersion** (content, content_html) ถ้าใช้แบบเดิม

2. **ID ให้ตรงกันระหว่าง ChromaDB กับ DB:**
   - ตอน Add เข้า ChromaDB ใช้ `document_id` (จาก PostgreSQL) ใส่ใน metadata ด้วย
   - Flow ที่สอดคล้องกัน: สร้าง/อัปเดต Document ใน DB ก่อน → ได้ document_id → ค่อย IndexDocument(id, content, metadata) เข้า ChromaDB

3. **Frontend ไม่ต้องเปลี่ยนวิธีเรียก:**
   - GET /api/categories, /api/articles/popular, /api/articles/:id ฯลฯ ยังเรียกเหมือนเดิม
   - ข้อมูลจะมาจาก DB ที่เรา sync จาก carmen-cloud เข้าไป

---

## สรุปสั้น ๆ

- **เก็บใน Vector (Chroma):** มีแล้ว — ข้อมูลจาก carmen-cloud ไป ChromaDB ตอน index
- **เก็บและแสดงที่ frontend:** ต้องให้เวลา index จาก carmen-cloud **เขียนลง PostgreSQL (Document + Category)** ด้วย แล้ว frontend ถึงจะมีรายการและเนื้อหาบทความให้แสดงผ่าน API เดิม

ไฟล์ที่เกี่ยวข้อง:
- `internal/services/indexing_service.go` — เพิ่มขั้นตอนสร้าง/อัปเดต Document (และ Category) ผ่าน `docService` ก่อน/หลังเรียก `IndexDocument`
- `internal/services/document_service.go` — ใช้สร้าง Document / DocumentVersion
- `internal/storage/document_repository.go`, `category_repository.go` — ใช้เขียนลง DB
