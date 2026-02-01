# เช็กบน VM ทำไม Sync ไม่อัปเดตไป GitHub

ถ้าทำตาม WIKI_SYNC_TO_GIT_FIX.md แล้วยังไม่อัปเดต ต้องเข้า **VM ที่รัน Wiki.js** แล้วรันคำสั่งด้านล่างเพื่อดูสาเหตุจริง

---

## ขั้นที่ 1: เข้า VM

- SSH หรือ Remote Desktop เข้า VM ที่รัน wiki.semapru.com

---

## ขั้นที่ 2: หาโฟลเดอร์ repo ของ Wiki.js

โฟลเดอร์ที่เก็บ Git ของ Wiki.js มักอยู่ใต้โฟลเดอร์ที่ติดตั้ง Wiki.js ชื่อ `data/repo`

**Linux (ค้นหาโฟลเดอร์ที่มี .git):**
```bash
sudo find / -name ".git" -type d 2>/dev/null | head -20
```
ดูว่ามี path แบบ `.../data/repo/.git` หรือไม่ แล้วใช้ path นั้น (ไม่รวม `.git`)

**หรือถ้ารู้ว่า Wiki.js อยู่ที่ไหน เช่น `/var/wiki` หรือ `/home/user/wiki`:**
```bash
ls -la /var/wiki/data/repo
# หรือ
ls -la /home/user/wiki/data/repo
```
ถ้าเห็นโฟลเดอร์ `.git` และไฟล์อื่น แปลว่าถูกที่

แทนที่ `/path/to/wiki/data/repo` ด้านล่างด้วย path จริงที่คุณหาได้

---

## ขั้นที่ 3: เช็กสถานะ Git

```bash
cd /path/to/wiki/data/repo

# ดู remote ว่าชี้ GitHub ถูกไหม
git remote -v

# ดูว่ามีไฟล์รอ commit ไหม
git status

# ดู commit ล่าสุด
git log -1 --oneline
```

**แปลผล:**

| ผลลัพธ์ | ความหมาย |
|--------|----------|
| `origin` ชี้ไปที่ repo อื่น (ไม่ใช่ new-carmen) | ต้องแก้ remote ในโฟลเดอร์นี้: `git remote set-url origin https://github.com/Sunshine050/new-carmen.git` |
| `git status` แสดงไฟล์ใหม่/แก้ไขแต่ยังไม่ commit | Wiki.js ยังไม่ commit (หรือ Add Untracked ไม่ทำงาน) → ลอง commit เองด้านล่าง |
| `git status` สะอาด และ `git log` มี commit ล่าสุด | แปลว่ามี commit แล้ว → ให้ลอง push เองด้านล่าง |

---

## ขั้นที่ 4: ลอง push เองจาก VM

```bash
cd /path/to/wiki/data/repo

# ถ้ามีไฟล์ยังไม่ add
git add .
git status
git commit -m "wiki content from VM"

# push ขึ้น GitHub
git push origin main
```

**ดูข้อความที่ขึ้น:**

- ถ้า **push ผ่าน** → แปลว่า VM ต่อ GitHub ได้ และสิทธิ์ push ใช้ได้ ปัญหาอยู่ที่ Wiki.js ไม่ได้รัน push (หรือ Sync Direction / ปุ่มที่กดยังไม่ใช่ push)  
  → ไปเช็กใน Wiki.js ว่า Sync Direction เป็น Push to target / Bi-directional และกด Force Sync อีกครั้ง หลัง push เองแล้วไปรีเฟรช GitHub จะเห็น commit นั้น

- ถ้า **error ประมาณ "Permission denied" / "Authentication failed"** → ปัญหาอยู่ที่การเชื่อมต่อ GitHub  
  → ต้องตั้งค่าใน Wiki.js ใช้ **HTTPS + PAT** (และใช้ PAT ใหม่ที่ยังไม่ revoke) หรือถ้ารัน push เองจาก VM ต้องตั้งค่า git credentials บน VM (เช่น `git config credential.helper` หรือใช้ PAT ใน URL)

- ถ้า **error ประมาณ "Could not resolve host" / "Connection refused"** → VM ออกเน็ตไม่ได้หรือ firewall บล็อก  
  → ต้องแก้เน็ต/ firewall บน VM

---

## ขั้นที่ 5: ตั้งค่า Git credentials บน VM (ถ้า push ขึ้น error auth)

ถ้า push เองจาก VM แล้วขึ้นว่า permission/authentication:

**ใช้ HTTPS + PAT:**

```bash
cd /path/to/wiki/data/repo
git remote set-url origin https://github.com/Sunshine050/new-carmen.git
git push origin main
```
เมื่อถาม username/password:
- Username = GitHub username
- Password = **GitHub Personal Access Token** (ไม่ใช่รหัสผ่านเข้า GitHub)

หรือใส่ PAT ใน URL (ไม่แนะนำถ้ามีคนอื่นใช้ VM):
```bash
git remote set-url origin https://YOUR_USERNAME:YOUR_PAT@github.com/Sunshine050/new-carmen.git
git push origin main
```

ถ้า push ผ่านแล้ว แปลว่า credential ใช้ได้ แต่ Wiki.js อาจไม่ได้ใช้ credential เดียวกัน → ต้องตั้งค่าใน Wiki.js ให้ใช้ **Basic (HTTPS)** + **Username** + **PAT** ให้ตรงกับที่ใช้บน VM

---

## สรุป

1. เข้า VM → หา path โฟลเดอร์ `data/repo` ของ Wiki.js  
2. ในโฟลเดอร์นั้นรัน: `git remote -v`, `git status`, `git log -1`  
3. ลอง `git add .`, `git commit -m "..."`, `git push origin main`  
4. ดูข้อความ error (ถ้ามี) แล้วแก้ตามตารางด้านบน  
5. ถ้า push เองผ่าน แต่ Sync ใน Wiki.js ยังไม่อัปเดต → ปัญหาอยู่ที่ Wiki.js (Sync Direction / การกดปุ่ม / หรือ credential ที่ Wiki.js ใช้)

ถ้าส่ง **ข้อความ error ที่ขึ้นตอน `git push`** (หรือผลลัพธ์ของ `git status` / `git remote -v`) มาได้ จะช่วยบอกขั้นถัดไปได้ตรงจุดมากขึ้น
