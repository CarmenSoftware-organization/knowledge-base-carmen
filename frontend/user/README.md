# Carmen Frontend (Next.js)

Frontend สำหรับระบบ KB Carmen

หน้าจอหลัก:
- KB categories/articles (`/`, `/categories`, `/categories/[category]`, `/categories/[category]/[...article]`)
- FAQ (`/faq`, `/faq/[...path]`)
- Activity (`/activity`, `/admin/activity`)
- Floating chat widget (render จาก layout หลัก)

## Tech Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS + Radix UI
- next-intl (th/en)
- Markdown rendering: `react-markdown` + `remark/rehype`

## Run Local

```bash
cd frontend/user
npm install
npm run dev
```

คำสั่งหลัก:

```bash
npm run build
npm run start
npm run lint
npm test
```

## Environment Variables

- `NEXT_PUBLIC_API_BASE`  
  Base URL ของ Go backend (เช่น `http://localhost:8080`)
- `NEXT_PUBLIC_USE_REMOTE_API`  
  ถ้าเป็น dev และต้องการใช้ remote API ให้ตั้ง `true`

ดู logic การเลือก API base ใน `lib/config.ts`

## Integration หลักกับ Backend

เรียก API ผ่าน Go backend เป็นหลัก:
- Wiki: `/api/wiki/*`
- Chat: `/api/chat/ask`, `/api/chat/stream`, `/api/chat/feedback/*`
- Activity: `/api/activity/*`
- FAQ: `/api/faq/*`
- BU list: `/api/business-units`

หมายเหตุ:
- หน้า chat ใช้ stream จาก `/api/chat/stream` (NDJSON events)
- default BU มาจาก cookie/setting (`selected_bu`)
