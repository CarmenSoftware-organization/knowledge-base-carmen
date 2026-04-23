# Handover: วิธีเพิ่ม BU ใหม่ + ฟอร์แมต Markdown

เอกสารนี้สรุปขั้นตอนแบบใช้งานจริงสำหรับคนใหม่ที่ต้องเพิ่ม Business Unit (BU) ในโปรเจกต์ `kb-carmen` และแปลงไฟล์เป็น `.md` ให้ตรงฟอร์แมตที่ระบบอ่านได้

---

## 1) ภาพรวมสิ่งที่ต้องเพิ่มเมื่อมี BU ใหม่

ขั้นต่ำต้องมี 4 ส่วนนี้:

1. **DB**
   - มี record ใน `public.business_units`
   - มี schema ของ BU ใหม่ (เช่น `newbu`)
   - มีตาราง `documents`, `document_chunks` ใน schema นั้น
2. **Content ใน repo**
   - มีโฟลเดอร์ `contents/<bu-slug>/`
   - มี `index.md` ระดับ root ของ BU
   - มีหมวด/บทความ `.md` ใต้โฟลเดอร์ BU
3. **Indexing**
   - sync wiki และ rebuild index ของ BU ใหม่
4. **(ถ้าใช้ FAQ)**
   - ต้อง seed ตาราง `public.faq_*` ด้วย BU slug เดียวกัน

> ระบบ backend รองรับ BU แบบ dynamic จาก query `?bu=<slug>` และ resolve path จาก `contents/<bu>` อยู่แล้ว

---

## 1.1) Automation (Production) ที่เพิ่มไว้แล้ว

มี workflow ใหม่: `.github/workflows/auto-provision-sync-reindex.yml`

เมื่อมี push เข้า `main` และไฟล์อยู่ใต้ `contents/**` จะทำอัตโนมัติ:

1. Detect BU ที่เปลี่ยนจาก path `contents/<bu>/...`
2. เรียก `POST /api/business-units/provision` (สร้าง/อัปเดต BU + schema + tables)
3. เรียก `POST /api/wiki/sync`
4. เรียก `POST /api/index/rebuild?bu=<bu>` สำหรับ BU ที่เปลี่ยน

ต้องตั้ง GitHub Actions secrets:

- `BACKEND_BASE_URL` เช่น `https://kb-carmen.onrender.com`
- `BACKEND_ADMIN_API_KEY` ให้ตรงกับ `ADMIN_API_KEY` ของ backend

ต้องมี backend env อย่างน้อย:

- `ADMIN_API_KEY`
- `GIT_REPO_URL`
- `GIT_REPO_PATH`
- `GIT_SYNC_BRANCH` (แนะนำ `main` สำหรับ repo นี้)

---

## 2) ข้อกำหนดชื่อ BU (สำคัญ)

- ใช้ `slug` ตัวพิมพ์เล็ก เช่น `newbu`, `acme_finance`
- ใช้ได้เฉพาะ pattern นี้: `^[a-zA-Z_][a-zA-Z0-9_]*$`
- ห้ามมี dash (`-`) ในชื่อ schema DB
- แนะนำให้ใช้ slug เดียวกันทั้ง:
  - `public.business_units.slug`
  - schema ชื่อเดียวกัน
  - โฟลเดอร์ `contents/<slug>`

---

## 3) ขั้นตอนเพิ่ม BU ใหม่ (Runbook)

ตัวอย่าง BU ใหม่: `acme`

### 3.1 เพิ่มในฐานข้อมูล

รัน SQL (ผ่าน psql / Beekeeper / Neon SQL editor):

```sql
INSERT INTO public.business_units (name, slug, description)
VALUES ('ACME', 'acme', 'Wiki / KB documents for ACME')
ON CONFLICT (slug) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS acme;
SELECT create_bu_tables('acme');
```

ถ้าระบบใช้ vector 2000 อยู่ ให้เช็คชนิดคอลัมน์ embedding ของ BU ใหม่:

```sql
ALTER TABLE acme.document_chunks
  ALTER COLUMN embedding TYPE vector(2000);
```

### 3.2 สร้างโครงสร้าง content

```bash
mkdir -p contents/acme
```

สร้างไฟล์ `contents/acme/index.md` (ตัวอย่าง):

```md
---
title: ACME
description: ACME Knowledge Base
published: true
date: 2026-04-21T00:00:00.000Z
tags: acme,documentation
editor: markdown
dateCreated: 2026-04-21T00:00:00.000Z
---

---
title: "ACME"
weight: 1
---

# ACME

- [Finance](./finance/)
- [Operations](./operations/)
```

จากนั้นเพิ่มหมวดและบทความจริง เช่น:

- `contents/acme/finance/index.md`
- `contents/acme/finance/Payment-Guide.md`

### 3.3 Sync + Reindex

ใช้สคริปต์ที่มีอยู่:

```bash
ADMIN_KEY="<your-admin-api-key>" ./scripts/sync-wiki-and-reindex-bu.sh acme
```

หรือ:

```bash
BU=acme ADMIN_KEY="<your-admin-api-key>" API_BASE=http://localhost:8080 ./scripts/sync-wiki-and-reindex-bu.sh
```

### 3.4 ตรวจสอบผล

- เรียก `GET /api/business-units` ต้องเห็น BU ใหม่
- เรียก `GET /api/wiki/categories?bu=acme` ต้องไม่ error
- เข้า UI แล้วเลือก BU ใหม่ได้ และเปิดบทความได้

### 3.5 คำสั่ง Reindex / Reset (ใช้บ่อย)

รันจาก root repo แล้วเข้า `backend` ก่อน:

```bash
cd backend
```

**Reindex**

```bash
# รีอินเด็กซ์ BU เดียว
go run cmd/server/main.go reindex acme

# รีอินเด็กซ์ทุก BU
go run cmd/server/main.go reindex all
```

**Reset index**

```bash
# ล้าง index ของ BU เดียว (ลบ documents/chunks ใน schema นั้น)
go run cmd/server/main.go reset index acme

# ล้าง index ทุก BU
go run cmd/server/main.go reset index all
```

**Reset public tables (activity/chat ฯลฯ)**

```bash
go run cmd/server/main.go reset all
```

**แบบยิงผ่าน API (sync + reindex)**

```bash
ADMIN_KEY="<your-admin-api-key>" ./scripts/sync-wiki-and-reindex-bu.sh acme
```

ลำดับที่แนะนำเวลาแก้ข้อมูลเยอะ:

1. `go run cmd/server/main.go reset index <bu>`
2. `go run cmd/server/main.go reindex <bu>`
3. ถ้า content เพิ่ง sync จาก git/wiki ให้รัน `sync-wiki-and-reindex-bu.sh <bu>` เพิ่ม

---

## 4) วิธีแปลงไฟล์เป็น .md (จากเอกสาร Word)

## A) ใช้สคริปต์ทั่วไป: `scripts/kb_docx_to_md.py`

เหมาะกับงานแปลงโฟลเดอร์ `.docx` เป็น `.md` แบบตรงไปตรงมา

ติดตั้ง dependency:

```bash
pip install -r scripts/requirements-kb-convert.txt
```

สั่งแปลง:

```bash
python scripts/kb_docx_to_md.py --input <path-docx> --output contents/acme
```

ถ้าต้อง mirror ไฟล์ `.md` กลับไปโฟลเดอร์ input ด้วย:

```bash
python scripts/kb_docx_to_md.py --input <path-docx> --output contents/acme --mirror
```

หมายเหตุ:
- default จะเก็บรูปที่ `_images/<article>/...` (แนะนำ)
- ไม่แนะนำ `--inline-images` เพราะไฟล์จะใหญ่มาก

## B) สคริปต์เฉพาะ Carmen/FAQ

ใน repo มีสคริปต์เฉพาะทางแล้ว เช่น:
- `scripts/import_carmen_docx_from_drive.py`
- `scripts/convert_carmen_docx_in_repo.py`
- `scripts/convert_carmen_faq.py`
- `scripts/blueledgers_faq_from_drive.py`

ถ้าเพิ่ม BU ใหม่และโครงสร้างไม่เหมือน Carmen/Blueledgers ให้เริ่มจากข้อ A ก่อน แล้วค่อยแตกสคริปต์เฉพาะ BU ภายหลัง

---

## 5) ฟอร์แมตไฟล์ .md ที่ถูกต้อง

โครงสร้างที่ระบบอ่านแน่นอน:

1. **YAML frontmatter บล็อกแรก** (metadata หลัก)
2. **(ถ้าต้องการจัดลำดับ sidebar)** บล็อกที่สองมี `weight`
3. **Body markdown** ที่มีหัวข้อ `# ...` หรือ `## ...`

ตัวอย่าง article:

```md
---
title: Payment Guide
description: How to process payment in ACME
published: true
date: 2026-04-21T00:00:00.000Z
tags: acme,documentation
editor: markdown
dateCreated: 2026-04-21T00:00:00.000Z
---

---
title: "Payment Guide"
weight: 10
---

## Payment Guide

รายละเอียดขั้นตอน...
```

### ฟิลด์ที่ใช้บ่อย (แนะนำให้มี)

- `title`: ชื่อบทความ
- `description`: คำอธิบายสั้น
- `published`: `true/false`
- `date`: เวลาเผยแพร่
- `tags`: comma-separated เช่น `acme,documentation`
- `editor`: ใช้ `markdown`
- `dateCreated`: วันที่สร้าง

### ฟิลด์ที่ optional

- `lang: th-TH` (ใช้เมื่ออยากกำหนดภาษา)
- `weight` (ใช้เรียงลำดับหมวด/บทความ ยิ่งน้อยยิ่งขึ้นก่อน)

---

## 6) โครงสร้างโฟลเดอร์ที่แนะนำ

```text
contents/acme/
  index.md
  finance/
    index.md
    Payment-Guide.md
  operations/
    index.md
  _images/
    payment-guide-abc123/
      img-001.png
```

แนวปฏิบัติ:
- ใช้ชื่อไฟล์สื่อความหมาย
- หลีกเลี่ยงอักขระแปลกในชื่อไฟล์
- รูปให้อยู่ใต้ `_images/...` และลิงก์แบบ relative path

---

## 7) เช็กลิสต์ก่อนส่งงาน/สอนงาน

- [ ] เพิ่ม BU ใน `public.business_units` แล้ว
- [ ] สร้าง schema BU และตารางด้วย `create_bu_tables('<slug>')` แล้ว
- [ ] มี `contents/<slug>/index.md` แล้ว
- [ ] มีบทความ `.md` เปิดอ่านได้จริง
- [ ] รูปในบทความโหลดได้ (`/wiki-assets/...` หรือ relative path ถูก)
- [ ] รัน `sync-wiki-and-reindex-bu.sh <slug>` แล้ว
- [ ] ทดสอบ API `/api/wiki/*?bu=<slug>` ผ่าน
- [ ] ทดสอบในหน้าเว็บว่าเลือก BU แล้วเห็น content ถูกต้อง

---

## 8) ปัญหาที่เจอบ่อย

- **404 บทความ**
  - path/ชื่อไฟล์ไม่ตรงจริงบนดิสก์
  - BU slug ผิดหรือไม่ตรง schema
- **ค้นหาไม่เจอ**
  - ลืม reindex
  - reindex ล้มเหลวที่ embedding/model
- **เพิ่ม BU แล้วหน้า landing ไม่ขึ้น**
  - ยังไม่ได้ insert `public.business_units`
- **index order แปลก**
  - ไม่ใส่ `weight` ใน `index.md` หรือ article

