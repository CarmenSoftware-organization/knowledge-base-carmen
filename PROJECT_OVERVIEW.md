# โครงสร้างโปรเจคทั้งระบบ & Tech Stack

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ผู้ใช้ (User)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
┌───────────────────────────┐        ┌───────────────────────────┐
│   Wiki.js (จัดการเนื้อหา)   │        │   Frontend (Search UI)     │
│   wiki.semapru.com        │        │   Next.js — ยังไม่สร้าง     │
│   บน VM                   │        └─────────────┬─────────────┘
└─────────────┬─────────────┘                      │
              │ Sync (Push)                        │ API
              ▼                                    ▼
┌───────────────────────────┐        ┌───────────────────────────┐
│   Git (GitHub)            │        │   Backend API             │
│   Sunshine050/new-carmen  │───────▶│   Go Fiber                │
└─────────────┬─────────────┘  Pull  └─────────────┬─────────────┘
              │                                    │
              │ Webhook / Schedule                 │ Query / Embed
              ▼                                    ▼
┌───────────────────────────┐        ┌───────────────────────────┐
│   N8N (Orchestration)     │        │   Ollama (LLM)             │
│   Trigger → Index         │        │   pgvector (PostgreSQL)    │
└─────────────┬─────────────┘        │   Neon (PostgreSQL)       │
              │                      └───────────────────────────┘
```

---

## ฝั่งต่างๆ ในระบบ

| ฝั่ง | บทบาท | สถานะ |
|------|--------|--------|
| **Wiki.js** | สร้าง/แก้ไข/ลบ เอกสาร (markdown), sync ขึ้น Git | ✅ ใช้อยู่ (บน VM) |
| **Git (GitHub)** | เก็บเนื้อหาจาก Wiki, เป็น source of truth | ✅ new-carmen repo |
| **Backend (Go Fiber)** | REST API, Auth, Document, Search, เชื่อม Ollama + pgvector + Neon | ✅ มีแล้ว |
| **Frontend** | หน้า Search / Chat UI ให้ผู้ใช้ | ⏳ ยังไม่สร้าง (แผนใช้ Next.js) |
| **N8N** | Trigger เมื่อ Git อัปเดต → ดึงจาก Git → สร้าง embedding → อัปเดต pgvector | 📋 วางแผนใช้ |
| **Neon (PostgreSQL)** | เก็บ metadata, pgvector สำหรับ semantic search | ✅ ใช้อยู่ |
| **Ollama** | LLM สำหรับวิเคราะห์คำถาม, สร้างคำตอบ, (และ embedding ถ้าใช้) | 📋 เตรียมใช้ (Week 2+) |

---

## Tech Stack แยกตามฝั่ง

### 1. Wiki.js (Content Management)
| รายการ | เทคโนโลยี |
|--------|-----------|
| แพลตฟอร์ม | Wiki.js |
| โฮสต์ | VM (ไม่ใช้ Docker) |
| Storage | Git (GitHub) — sync ทุก 5 นาที หรือตามที่ตั้ง |
| URL | https://wiki.semapru.com |

---

### 2. Git / Version Control
| รายการ | เทคโนโลยี |
|--------|-----------|
| Host | GitHub |
| Repo | https://github.com/Sunshine050/new-carmen |
| Branch | main |
| การเชื่อมต่อ | Wiki.js → push; Backend / N8N → pull หรือ API |

---

### 3. Backend API
| รายการ | เทคโนโลยี |
|--------|-----------|
| Language | Go |
| Framework | Fiber v2 |
| โครงสร้าง | Clean Architecture (api, router, services, repositories, domain, config, database, middleware, utils) |
| ORM | GORM |
| Auth | JWT, bcrypt, Role-based (Superadmin, Admin, Guest) |
| External clients | Ollama, GitHub (ใน pkg/) |

---

### 4. Frontend (แผน)
| รายการ | เทคโนโลยี |
|--------|-----------|
| Framework | Next.js |
| สถานะ | ยังไม่สร้าง |

---

### 5. Database (Metadata)
| รายการ | เทคโนโลยี |
|--------|-----------|
| บริการ | Neon (PostgreSQL บน cloud) |
| โครงสร้าง | users, roles, user_roles, documents, document_versions, document_permissions |
| การเชื่อมต่อ | Backend ใช้ GORM + connection string จาก .env |

---

### 6. Vector DB (Semantic Search)
| รายการ | เทคโนโลยี |
|--------|-----------|
| บริการ | pgvector (PostgreSQL) |
| บทบาท | เก็บ embedding ของเอกสาร สำหรับ semantic search |
| การอัปเดต | Backend indexing service |
| การ query | Backend (Go) เรียก pgvector ตอน search |

---

### 7. AI / LLM
| รายการ | เทคโนโลยี |
|--------|-----------|
| บริการ | Ollama |
| บทบาท | วิเคราะห์คำถาม, สร้างคำตอบ (RAG), (embedding ถ้าต้องการ) |
| การเรียกใช้ | Backend (Go) ผ่าน pkg/ollama |

---

### 8. N8N (Orchestration)
| รายการ | เทคโนโลยี |
|--------|-----------|
| บทบาท | Trigger เมื่อ Git อัปเดต → ดึงเนื้อหา → สร้าง embedding → อัปเดต pgvector |
| Trigger | GitHub Webhook (push) หรือ Schedule |
| Tech | N8N (low-code workflow) |

---

### 9. เครื่องมือพัฒนา / จัดการ
| รายการ | เทคโนโลยี |
|--------|-----------|
| IDE | VS Code / Cursor |
| DB Client | Beekeeper Studio (เชื่อม Neon) |
| Version Control (local) | Git, โฟลเดอร์ workspace = clone ของ new-carmen |

---

## โครงสร้างโฟลเดอร์ (Repo new-carmen)

```
New-carmen/
├── backend/                 # Backend API (Go Fiber)
│   ├── cmd/server/          # Entry point
│   ├── internal/            # api, config, database, domain, middleware, repositories, router, services, utils
│   ├── pkg/                  # ollama, github clients
│   ├── migrations/
│   └── docs/                 # เอกสาร flow, debug
├── frontend/                 # (ยังไม่สร้าง) Next.js
├── README.md
└── PROJECT_OVERVIEW.md       # ไฟล์นี้
```

เนื้อหาจาก Wiki.js ที่ sync ขึ้น Git จะอยู่ใน path ตามที่ Wiki.js ตั้ง (มักเป็น data/ หรือ content/ ใน repo)

---

## สรุป Tech Stack ทั้งระบบ

| ฝั่ง | Tech Stack |
|------|------------|
| **Content** | Wiki.js, Markdown |
| **Version Control** | Git, GitHub (new-carmen) |
| **Backend** | Go, Fiber, GORM |
| **Database** | Neon (PostgreSQL) |
| **Vector DB** | pgvector (PostgreSQL) |
| **AI/LLM** | Ollama |
| **Orchestration (Indexing)** | N8N |
| **Frontend (แผน)** | Next.js |
| **Tools** | Beekeeper, Cursor/VS Code |

---

## Flow สั้นๆ

1. **Wiki.js** — ผู้ใช้สร้าง/แก้ไข เอกสาร → Sync ขึ้น **GitHub (new-carmen)**
2. **N8N** — ถูก trigger (Webhook/Schedule) → ดึงจาก Git → สร้าง embedding → อัปเดต **pgvector**
3. **Frontend** — ผู้ใช้ค้นหา → เรียก **Backend API**
4. **Backend** — รับคำค้น → ใช้ **pgvector** (vector) + **Ollama** (RAG) → ส่งผลลัพธ์กลับ
5. **Backend** — เก็บ metadata ผู้ใช้/เอกสาร/สิทธิ์ ใน **Neon (PostgreSQL)**
