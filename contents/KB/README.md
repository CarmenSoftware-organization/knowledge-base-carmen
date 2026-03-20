# โฟลเดอร์ KB (นำเข้าจาก Word)

ไฟล์ `.docx` **ไม่แสดงใน Wiki / เว็บ / ระบบ index** โดยตรง ต้องแปลงเป็น **Markdown (`.md`)** ก่อน

## ควรเก็บไฟล์ไว้ที่ไหน (สรุปสั้นๆ)

| ที่เก็บ | ใช้ทำอะไร |
|--------|------------|
| `carmen_cloud/kb/` | แหล่งบน disk ที่ backend / job index RAG / บาง API มักอ่าน |
| `contents/carmen_cloud/kb/` | ให้ **Wiki.js** (Git sync `Target path = contents`) เห็นเมื่อต้องการให้ wiki มี KB ด้วย |
| `contents/KB/` | ที่วาง `.docx` ต้นทาง + (ถ้าใช้ `--mirror`) ไฟล์ `.md` สำเนา |

ถ้าต้องการทั้ง wiki + เว็บ/index: **ก็อปชุดเดียวกัน** ไปทั้งสองที่ หรือรันสคริปต์สองครั้งโดยเปลี่ยน `--output` เป็น `contents/carmen_cloud/kb` (และอย่าลืมโฟลเดอร์ `_images` ไปด้วย)

**หมายเหตุ `/faq`:** หน้าเว็บ `/faq` ดึงจาก **ฐานข้อมูล** ผ่าน API (`/api/faq/...`) ไม่ได้อ่าน `.md` ใน `carmen_cloud/kb` อัตโนมัติ — ต้องมีขั้นตอน import/sync เข้า DB แยก (ถ้ามีสคริปต์หรือ admin ในโปรเจกต์ให้ใช้ตามนั้น)

## ทำไมใน `.md` ถึงมีข้อความยาวๆ แปลกๆ (ไม่ใช่ภาษาเพี้ยน)

เวอร์ชันเก่าของ mammoth ฝังรูปเป็น `![](data:image/png;base64,...)` ทำให้บรรทัดยาวมหาศาล ดูเหมือนตัวอักษรเพี้ยนใน editor  
สคริปต์ปัจจุบันแยกรูปไปที่ **`_images/<ชื่อบทความ>/img-001.png`** แทน (แนะนำ) — รันแปลงใหม่หลังอัปเดตสคริปต์

## วิธีแนะนำ (ใช้สคริปต์ใน repo)

จาก root โปรเจกต์ `new-carmen`:

```bash
pip install -r scripts/requirements-kb-convert.txt

# สร้าง .md + โฟลเดอร์รูป ใน carmen_cloud (ให้เว็บ + indexing ใช้)
python scripts/kb_docx_to_md.py --input contents/KB --output carmen_cloud/kb

# สำเนา .md (และ _images) กลับไปที่โฟลเดอร์ KB เคียง .docx
python scripts/kb_docx_to_md.py --input contents/KB --output carmen_cloud/kb --mirror

# ถ้าต้องการให้ Wiki.js เห็นโดยตรงใต้ mirror เดิมของ repo:
python scripts/kb_docx_to_md.py --input contents/KB --output contents/carmen_cloud/kb
```

จากนั้น:

1. `git add carmen_cloud/kb contents/KB` (และ `contents/carmen_cloud/kb` ถ้าใช้)
2. `git commit` + `git push`
3. Wiki.js → **Force Sync**
4. Backend: รัน **re-index / sync wiki** ตามที่ใช้อยู่

## ทางเลือก: Pandoc (คุณภาพ layout มักดีกว่า)

ติดตั้ง [Pandoc](https://pandoc.org/installing.html) แล้ว:

```bash
cd contents/KB
for f in *.docx; do pandoc "$f" -o "${f%.docx}.md" -t markdown; done
```

แล้วย้าย/ก็อป `.md` ไป `carmen_cloud/kb/` ให้ตรงกับ path ที่เว็บใช้
