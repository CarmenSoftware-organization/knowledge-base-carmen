# Wiki & Content Sync (สรุป)

ส่วนที่เกี่ยวข้อง:

- Wiki service: `backend/internal/services/wiki_service.go`
- Wiki sync service: `backend/internal/services/wiki_sync_service.go`
- Webhook handler: `backend/internal/api/github_webhook_handler.go`
- Static assets: `RegisterWiki` ทำ `app.Static("/wiki-assets", config.GetWikiContentPath())`

พฤติกรรมหลัก:

1. `WikiService` อ่านไฟล์ Markdown จาก path ที่กำหนดใน `config.GetWikiContentPath()` (ค่าเริ่มต้น `./wiki-content`) หรือจาก GitHub (fallback)
2. `WikiSyncService` (ใช้ `pkg/github` client) จะทำ `git pull` (หรือ clone) ไปยัง local repo ตามค่า `GIT_REPO_PATH`/`WIKI_CONTENT_PATH`
3. Endpoint `POST /api/wiki/sync` เรียก `syncService.Sync()` เพื่อดึงเนื้อหาใหม่แบบ synchronous
4. เมื่อ GitHub push มายัง `/webhook/github` (และ branch ตรงตาม config) handler จะเรียก sync แล้วสั่ง indexing แบบ background

การจัดโครงสร้างของ markdown:

- `WikiService` คาดว่าเนื้อหาจัดเรียงเป็นไฟล์ `.md` โดย `Path` เช่น `configuration/CF-company_profile.md` และมี frontmatter แบบ YAML (`---` ... `---`)
- ฟิลด์ที่อ่านได้จาก frontmatter: `title`, `description`, `published`, `date`, `tags`, `editor`, `dateCreated`, `weight` เป็นต้น

คำแนะนำ:

- ตรวจสอบให้แน่ใจว่า `GITHUB_WEBHOOK_SECRET`, `GITHUB_WEBHOOK_BRANCH` ตั้งค่าถูกต้องใน `.env`
- ถ้าต้องการให้ N8N ดึงแทน backend ให้ออกแบบ workflow ที่เรียก endpoint หรือใช้ GitHub webhook เป็น trigger แล้วให้ N8N เรียก API embedding
