# Git / Branching & Workflow (สรุป + ข้อเสนอแนะ)

สถานะ remote/branch ที่พบ (จาก repo):

- local branches: `main`, `Git-+-wiki`, `wiki-content`
- remotes: `origin` -> `https://github.com/Sunshine050/new-carmen.git`
- ยังมี remotes อื่นที่เชื่อมถึง repo ชื่อ `docscarmen` (fetch/push)

ข้อเสนอ workflow (แนะนำ):

1. `main` — branch หลักสำหรับ deployment/production-ready code
2. feature branches — สร้างจาก `main` เช่น `feature/indexing`, `feature/wiki-sync`
3. `wiki-content` (ถ้าต้องการเก็บ snapshot ของ wiki) — หรือให้ Wiki.js push ตรงไปที่ repo โดยใช้ branch ที่กำหนด (เช่น `wiki-content`) แล้ว Backend webhook ตรวจเฉพาะ branch นี้
4. Pull Request → Code review → Merge to `main`

Webhook / CI:

- ตั้ง GitHub Webhook ให้ชี้มาที่ backend `/webhook/github` (หรือ N8N endpoint) และตั้ง secret (GITHUB_WEBHOOK_SECRET)
- webhook จะตรวจ `ref` และเปรียบเทียบกับ `GITHUB_WEBHOOK_BRANCH` ก่อนรัน sync/indexing

ข้อควรระวัง:

- หากมีหลาย remote ให้ตรวจสอบว่า origin/push ถูกต้องก่อน deploy
- หาก Wiki.js push อัตโนมัติ ควรแยก branch สำหรับ content เท่านั้น เพื่อหลีกเลี่ยงการ trigger workflow ที่ไม่ต้องการ
