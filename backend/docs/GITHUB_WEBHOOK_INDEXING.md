# GitHub Webhook → Backend Indexing Flow

โฟลวใหม่ (แทน N8N):

```text
Wiki.js ──(Git Sync)──▶ GitHub Repo ──(push)──▶ GitHub Webhook
                                          │
                                          ▼
                                   POST /webhook/github (Backend)
                                          ▼
                              Detect changed .md files
                                          ▼
                               Load Markdown via GitHub API
                                          ▼
                            IndexDocument (ChromaDB, metadata)
                                          ▼
                                (ต่อยอด: update PostgreSQL)
```

## 1. Endpoint ฝั่ง Backend

- URL: `POST /webhook/github`
- Event: รองรับเฉพาะ **push event**
- Branch ที่ใช้ทำงาน: จาก env `GITHUB_WEBHOOK_BRANCH` (ถ้าไม่ตั้งจะใช้ `GITHUB_BRANCH`)

โค้ดหลัก:

- Handler: `internal/api/github_webhook_handler.go` → `GitHubWebhookHandler.HandlePush`
- Service: `internal/services/indexing_service.go` → `IndexingService.ProcessGitHubPush`
- Payload struct: `internal/models/github_webhook.go`

พฤติกรรม:

1. ตรวจ header `X-GitHub-Event` ต้องเป็น `"push"`
2. ถ้าตั้งค่า `GITHUB_WEBHOOK_SECRET` → ตรวจ `X-Hub-Signature-256` ด้วย HMAC SHA-256
3. เช็ค `payload.ref` ต้องเท่ากับ `refs/heads/GITHUB_WEBHOOK_BRANCH`
4. รวมไฟล์ที่ `added` และ `modified` จากทุก commit
5. คัดเฉพาะไฟล์นามสกุล `.md`
6. โหลดเนื้อหาไฟล์จาก GitHub ผ่าน `pkg/github/client.go`
7. ส่งเข้า `IndexDocument` เพื่อ upsert เข้า ChromaDB พร้อม metadata: `{ path, type: "markdown" }`

> หมายเหตุ: ตอนนี้ยังไม่ได้ลบข้อมูลกรณีไฟล์ถูกลบ (removed) และยังไม่ได้ผูกกับ Document ใน PostgreSQL แบบเต็ม ๆ เป็นสเต็ปต่อไปได้

## 2. การตั้งค่า .env / Config

ใน `backend/.env` (หรือตัวแปร env ของ backend) ต้องมี:

```env
# สำหรับ GitHub API client (โหลดไฟล์ Markdown)
GITHUB_TOKEN=ghp_xxx
GITHUB_REPO_OWNER=Sunshine050
GITHUB_REPO_NAME=new-carmen
GITHUB_BRANCH=wiki-content        # หรือ branch ที่ Wiki.js sync เข้ามา

# สำหรับ Webhook
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_WEBHOOK_BRANCH=wiki-content  # ถ้าไม่ตั้ง จะ fallback ไปใช้ GITHUB_BRANCH
```

ตัวแปรเหล่านี้ถูกอ่านใน `internal/config/config.go` → `AppConfig.GitHub`

## 3. การตั้งค่า GitHub Webhook

ไปที่ GitHub repo ที่เก็บ Markdown (เช่น `Sunshine050/new-carmen`):

1. Settings → Webhooks → **Add webhook**
2. ตั้งค่า:
   - **Payload URL**:  
     - ถ้ารันบนเครื่องตัวเอง: ต้องผ่าน ngrok หรือ reverse proxy เช่น  
       `https://<your-ngrok-id>.ngrok.io/webhook/github`
     - ถ้า deploy แล้ว: `https://your-backend-domain.com/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: กรอกค่าเดียวกับ `GITHUB_WEBHOOK_SECRET`
   - **Which events would you like to trigger this webhook?**  
     - เลือก **Just the push event**
3. กด **Add webhook**

จากนี้ทุกครั้งที่มี `push` ไปที่ branch ที่กำหนด (เช่น `wiki-content`) GitHub จะยิง `POST /webhook/github` ให้ backend

## 4. สิ่งที่คุณต้องทำต่อ

1. **ตั้งค่า .env ของ backend**
   - ใส่ `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BRANCH`
   - ใส่ `GITHUB_WEBHOOK_SECRET`, `GITHUB_WEBHOOK_BRANCH` ให้ตรงกับ repo/branch ที่ Wiki.js sync

2. **ตั้งค่า GitHub Webhook** ตามหัวข้อด้านบน ให้ชี้มาที่ backend URL จริงของคุณ

3. **ทดสอบ**
   - รัน backend (`air` ตามที่ตั้งไว้)
   - แก้ไข/สร้างไฟล์ Markdown ใน Wiki.js → ให้มัน sync ไป GitHub
   - ดู log backend ว่ามี `[indexing] indexed <path>` ปรากฏหรือไม่

4. (ทางเลือกในอนาคต) **ผูกกับ PostgreSQL / Document**
   - ตอนนี้ indexing จะ upsert เข้า ChromaDB พร้อม metadata (`path`, `type`)
   - ถ้าต้องการ track เป็น Document/Article ใน PostgreSQL ด้วย สามารถขยาย `IndexingService` ให้:
     - map path → Document record
     - อัปเดต title/tags/metadata อื่น ๆ ลง PostgreSQL

