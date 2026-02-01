# Flow: Wiki.js → Git → N8N → ChromaDB (Vector)

## Flow ที่ต้องการ

```
Wiki.js (CRUD เอกสาร)
    ↓ ทันที
Git (new-carmen repo) — push อัตโนมัติทุกครั้งที่แก้ไข
    ↓ trigger
N8N (เปรียบเทียบ/ตรวจจับการเปลี่ยนแปลง แล้วอัปเดต vector)
    ↓
ChromaDB (embedding / vector)
```

- **Backend (Go Fiber)** = ไม่ทำส่วน Git → Vector (ไม่ทำ indexing จาก Git ไป ChromaDB เอง)
- **N8N** = ทำหน้าที่ trigger + ดึงจาก Git + สร้าง embedding + ส่งเข้า ChromaDB

---

## ส่วนที่ 1: Wiki.js → Git (อัปเดตทันทีทุกครั้ง)

### เป้าหมาย
ทุกครั้งที่มีการสร้าง/แก้ไข/ลบ หน้าใน Wiki.js ให้ push ขึ้น Git ทันที (หรือเร็วที่สุด)

### วิธีทำใน Wiki.js

1. **Sync Direction**  
   ตั้งเป็น **Bi-directional** หรือ **Push to target**

2. **Sync Schedule**  
   - ถ้า Wiki.js มีตัวเลือก **“On every change” / “Immediate”** ให้เลือก  
   - ถ้าไม่มี ให้ตั้งเป็น **ทุก 1 นาที** (Every **1** Minute) เพื่อให้เกือบทันที

3. **ทางเลือกเพิ่ม (ถ้ามี)**  
   - ดูว่ามี **Webhook** เมื่อ save หน้า หรือ **“Sync on save”** หรือไม่ ถ้ามีให้เปิดใช้

ผลลัพธ์: เนื้อหาจาก Wiki จะไปอยู่ที่ Git (repo new-carmen) หลัง save ไม่นาน

---

## ส่วนที่ 2: Git → N8N → ChromaDB (อัปเดต Vector อัตโนมัติ)

### เป้าหมาย
เมื่อ Git มีการอัปเดต (มี push ใหม่) ให้ N8N ทำงาน: ดึงเนื้อหาจาก Git → เปรียบเทียบ/ตัดเฉพาะที่เปลี่ยน → สร้าง embedding → อัปเดต ChromaDB

### วิธีทำใน N8N

**ขั้นที่ 1: Trigger (เมื่อ Git มีการอัปเดต)**

- **แบบ A – GitHub Webhook (แนะนำ)**  
  - ใน GitHub repo **new-carmen**: Settings → Webhooks → Add webhook  
  - Payload URL = URL ของ N8N webhook (จะสร้างใน workflow)  
  - Content type: `application/json`  
  - Event: **Push events**  
  - เมื่อมี push ที่ repo นี้ GitHub จะส่ง request ไปที่ N8N → N8N รู้ทันทีว่า Git อัปเดต

- **แบบ B – ตามเวลา (Schedule)**  
  - ใช้ Trigger แบบ Cron/Interval ใน N8N (เช่น ทุก 2–5 นาที)  
  - แต่ละครั้งให้ workflow ไปดึงจาก Git (หรือ GitHub API) แล้วเช็กว่ามี commit ใหม่หรือไม่ ถ้ามีค่อยทำขั้นถัดไป

**ขั้นที่ 2: ดึงเนื้อหาจาก Git**

- ใช้ **Git** node หรือ **HTTP Request** ไป GitHub API  
  - เช่น `GET https://api.github.com/repos/Sunshine050/new-carmen/contents/...` (หรือ path ที่ Wiki.js push ไป)  
  - หรือใน N8N ที่รันบน VM อาจ clone/pull repo แล้วอ่านไฟล์จากโฟลเดอร์  
- ได้รายการไฟล์/เนื้อหา markdown ที่เปลี่ยน (จาก webhook payload หรือจากการเปรียบเทียบกับ commit ก่อนหน้า)

**ขั้นที่ 3: เปรียบเทียบ / เลือกเฉพาะที่เปลี่ยน (ถ้าต้องการ)**

- ถ้าใช้ **Webhook**: จาก payload มีรายการไฟล์ที่เปลี่ยนใน push นั้น → ใช้เฉพาะไฟล์เหล่านี้  
- ถ้าใช้ **Schedule**: เปรียบเทียบ commit ล่าสุดกับที่เคย index ไว้ (เก็บ commit sha ไว้ใน N8N หรือ DB) แล้วประมวลผลเฉพาะไฟล์ที่เปลี่ยน

**ขั้นที่ 4: สร้าง Embedding**

- สำหรับแต่ละชิ้นเนื้อหา (หรือแต่ละไฟล์/แต่ละ section):  
  - เรียก **Ollama** (หรือ embedding model อื่น) ผ่าน HTTP ใน N8N  
  - เช่น `POST http://ollama:11434/api/embeddings` (หรือ URL จริงของ Ollama)  
  - ได้ vector มาเตรียมส่งเข้า ChromaDB

**ขั้นที่ 5: อัปเดต ChromaDB**

- ใช้ **HTTP Request** ใน N8N เรียก ChromaDB API  
  - เพิ่ม/อัปเดต document ใน collection (เช่น `carmen_documents`)  
  - ส่ง id (เช่น path ไฟล์ + version), embedding, metadata (path, title ฯลฯ)

**ขั้นที่ 6 (ถ้าต้องการ): ลบออกจาก Vector เมื่อลบใน Wiki**

- ถ้าใน Git มีการลบไฟล์ (จาก Wiki) ให้ N8N รับรู้ (จาก webhook หรือการเปรียบเทียบ) แล้วเรียก ChromaDB API ลบ document ที่ตรงกับ path นั้น

---

## สรุปบทบาท

| ส่วน | บทบาท |
|------|--------|
| **Wiki.js** | CRUD เอกสาร → push ขึ้น Git ทันที (หรือทุก 1 นาที) |
| **Git (new-carmen)** | เก็บเนื้อหาจาก Wiki เป็น source of truth |
| **N8N** | Trigger เมื่อ Git อัปเดต → ดึงจาก Git → เปรียบเทียบ/เลือกที่เปลี่ยน → สร้าง embedding → อัปเดต ChromaDB |
| **ChromaDB** | เก็บ vector สำหรับ search |
| **Backend (Go Fiber)** | ไม่ทำ indexing Git → Vector; ใช้เฉพาะ query กับ ChromaDB/Ollama ตอน search |

---

## ขั้นตอนทำจริง (สรุป)

1. **Wiki.js**  
   - Sync Direction = Bi-directional หรือ Push to target  
   - Sync = ทันทีถ้ามี หรือทุก 1 นาที  

2. **GitHub**  
   - สร้าง Webhook ของ repo **new-carmen** ชี้ไปที่ N8N webhook URL (สำหรับ push events)  

3. **N8N**  
   - สร้าง workflow: Trigger (GitHub webhook หรือ Schedule) → ดึงเนื้อจาก Git → สร้าง embedding (Ollama) → อัปเดต ChromaDB  
   - เก็บ credentials (GitHub, Ollama, ChromaDB) ใน N8N  

4. **Backend**  
   - ไม่ต้องเพิ่ม logic Git → Vector; มีแค่ใช้ ChromaDB + Ollama ตอน search ตามที่ออกแบบไว้แล้ว  

ถ้าต้องการ ผมสามารถเขียนเป็น “ขั้นตอนทีละขั้นใน N8N” (ชื่อ node, ตัวอย่าง payload, ตัวอย่างการเรียก Ollama/ChromaDB) ให้ตรงกับ repo และ collection ที่คุณใช้ได้ต่อ
