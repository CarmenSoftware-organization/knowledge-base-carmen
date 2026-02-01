# แก้ Rebase Conflict (Merge conflict in README.md)

## สาเหตุ

มีการ rebase ที่พยายามนำ commit จากโปรเจกต์อื่น (RAG Chatbot) มารวมกับ new-carmen ทำให้เกิด conflict ที่ README.md

---

## วิธีแก้: ยกเลิก Rebase

**รันในโฟลเดอร์ที่มี rebase ค้างอยู่** (โฟลเดอร์ที่ขึ้น "Rebasing (1/13)" หรือมีไฟล์ `.git/rebase-merge`)

### ขั้นตอนที่ 1: ยกเลิก rebase

```bash
git rebase --abort
```

จะกลับไปสถานะก่อนเริ่ม rebase (branch เดิมไม่มี conflict)

---

### ขั้นตอนที่ 2: เลือกทำอย่างใดอย่างหนึ่ง

#### กรณี A: โฟลเดอร์นี้คือ new-carmen และอยากให้ตรงกับ GitHub

```bash
# ดึงจาก GitHub
git fetch origin

# ให้ branch ตรงกับ origin/main
git reset --hard origin/main
```

#### กรณี B: โฟลเดอร์นี้คือ repo ที่ Wiki.js ใช้ (เดิมชี้ Rag-Chatbot แล้วเปลี่ยนมา new-carmen)

ถ้า remote เปลี่ยนเป็น new-carmen แล้ว และอยากให้ในโฟลเดอร์มีแค่เนื้อหาจาก new-carmen (ไม่เอา commit เก่าจาก RAG Chatbot):

```bash
git rebase --abort
git fetch origin
git reset --hard origin/main
```

---

## สรุปคำสั่ง (รันตามลำดับ)

```bash
cd <โฟลเดอร์ที่มี rebase ค้าง>
git rebase --abort
git fetch origin
git reset --hard origin/main
```

**คำเตือน**: `git reset --hard` จะทิ้งการแก้ไขที่ยังไม่ commit ในโฟลเดอร์นั้น

---

## ถ้าเจอ "README.md: needs merge" / "you need to resolve your current index first"

รันใน **โฟลเดอร์ที่มี error** (ที่ Git บอก needs merge):

### วิธีที่ 1: ยกเลิก merge/rebase (แนะนำ ถ้าไม่ต้องการรวม history)

```bash
git merge --abort
```
หรือ
```bash
git rebase --abort
```

แล้วให้ branch ตรงกับ GitHub:
```bash
git fetch origin
git reset --hard origin/main
```

### วิธีที่ 2: แก้ conflict แล้วทำต่อ

1. เปิดไฟล์ `README.md` ที่มี conflict (จะมี `<<<<<<<`, `=======`, `>>>>>>>`)
2. ลบบรรทัด conflict markers ออก แล้วเลือกเก็บเฉพาะส่วนที่ต้องการ
3. บันทึกไฟล์ แล้วรัน:

```bash
git add README.md
git rebase --continue
```
หรือถ้าเป็น merge:
```bash
git add README.md
git commit -m "merge: resolve README conflict"
```
