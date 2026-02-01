# แก้ปัญหา: กด Sync แล้วเอกสารไม่อัปเดตไปที่ Git

## สิ่งที่ควรเกิด

- กด Sync (หรือ Force Sync) ใน Wiki.js  
- รีเฟรชที่ GitHub หรือ VS Code (repo new-carmen)  
- **ต้องเห็น** ไฟล์/โฟลเดอร์จาก Wiki โผล่มา หรือ commit ใหม่

ถ้ายังไม่เห็น = Sync ไม่ได้ push ขึ้น Git จริง

---

## เช็กและแก้ตามลำดับ

### 1. Sync Direction ต้องไม่ใช่ "Pull from target"

- ไปที่ **Storage → Git → Target Configuration**
- หา **Sync Direction**
- ถ้าเลือก **"Pull from target"** → Wiki.js จะ **ไม่ push** มีแค่ดึงจาก Git เข้ามา
- เปลี่ยนเป็น **"Push to target"** หรือ **"Bi-directional"**
- กด **Save**

---

### 2. ต้อง "Add Untracked Changes" ก่อน Sync

เนื้อหาใน Wiki อยู่ที่ **ฐานข้อมูล** ก่อน จะไปอยู่ที่ Git ได้ Wiki.js ต้องเอาเนื้อหาออกมาเขียนลง **local repo** ก่อน แล้วค่อย push

- ในหน้า **Storage → Git** เลื่อนลงไปที่ **Actions**
- กดปุ่ม **"Add Untracked Changes"**  
  → จะ export เนื้อหาจาก DB ลงโฟลเดอร์ `data/repo` และ add เข้า Git
- จากนั้นกด **"Force Sync"**  
  → จะ commit และ push ขึ้น GitHub

ลองทำตามนี้แล้วไปรีเฟรชที่ GitHub / VS Code ดูว่ามี commit/ไฟล์ใหม่หรือยัง

---

### 3. ถ้ายังไม่ขึ้น: มักเป็นเรื่อง Authentication (Push ไม่ผ่าน)

ถ้าใช้ **SSH** แต่ใส่ **GitHub PAT** ในช่อง SSH หรือใส่ผิดที่ → push จะล้มเหลว (บางที Wiki.js ไม่แสดง error ชัด)

**แนะนำ: ใช้ HTTPS + PAT แทน SSH**

1. ใน **Storage → Git**:
   - **Authentication Type** → เลือก **Basic**
   - **Repository URI** → เปลี่ยนเป็น  
     `https://github.com/Sunshine050/new-carmen.git`
   - **Username** → GitHub username ของคุณ
   - **Password / PAT** → ใส่ **GitHub Personal Access Token** (ที่เปิดสิทธิ์ `repo` เพื่อ push ได้)
   - ช่อง SSH (Private Key Path / Contents) ไม่ต้องใส่
2. กด **Save**
3. กด **Add Untracked Changes** แล้วกด **Force Sync** อีกครั้ง
4. รีเฟรชที่ GitHub / VS Code

---

### 4. เช็กจาก VM (ที่รัน Wiki.js)

ถ้ายังไม่ขึ้น ให้เข้า VM ที่รัน Wiki.js แล้วรันในโฟลเดอร์ repo:

```bash
cd /path/to/wiki/data/repo
git status
git log -1 --oneline
```

- ถ้า `git status` แสดงไฟล์ใหม่/แก้ไขแต่ยังไม่ commit → แปลว่า Wiki.js ยังไม่ commit (หรือขั้น Add Untracked ยังไม่ทำงาน)
- ถ้ามี commit แล้ว ลอง push เอง:
  ```bash
  git push origin main
  ```
  - ถ้า push แล้ว **error (เช่น authentication failed, permission denied)** → แก้ที่การตั้งค่า Authentication ใน Wiki.js ตามข้อ 3
  - ถ้า push ผ่าน → ที่ GitHub/VS Code จะเห็นเนื้อหาแล้ว และต่อไปให้แก้ให้ Wiki.js push ได้เอง (ข้อ 1–3)

---

## สรุปลำดับที่ทำ

1. ตั้ง **Sync Direction** = **Push to target** หรือ **Bi-directional** แล้ว Save  
2. กด **Add Untracked Changes** แล้วกด **Force Sync**  
3. รีเฟรช GitHub / VS Code  
4. ถ้ายังไม่ขึ้น → เปลี่ยนไปใช้ **HTTPS + PAT** (ข้อ 3) แล้วทำข้อ 2 อีกครั้ง  
5. ถ้ายังไม่ขึ้น → เข้า VM เช็ก `git status` / `git push` (ข้อ 4) เพื่อดูว่า error อยู่ที่ commit หรือที่ push

หลังแก้แล้ว ทุกครั้งที่กด Sync (หรือ Force Sync) และ Sync Direction ถูกต้อง เนื้อหาที่อัปเดตใน Wiki ควรไปโผล่ที่ Git หลังรีเฟรช
