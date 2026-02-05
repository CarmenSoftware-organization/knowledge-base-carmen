# Public API (รองรับ SRS Frontend)

Backend ได้เพิ่ม API ตาม SRS Carment-Cloud สำหรับฝั่ง Frontend (Knowledge Base / Manual) **ไม่ต้อง login**

---

## สรุปสิ่งที่ทำ

### 1. Models & DB
- **`internal/models/category.go`** – โมเดล Category (id, name, icon, sort_order)
- **`internal/models/article_feedback.go`** – โมเดล ArticleFeedback (document_id, helpful)
- **`internal/models/public_api.go`** – DTO สำหรับ request/response ตาม SRS
- **`internal/models/document.go`** – เพิ่ม `CategoryID`, `Tags` ใน Document
- **Migration** – ใน `cmd/server/main.go` เพิ่ม migrate สำหรับ Category, ArticleFeedback

### 2. Storage
- **`internal/storage/category_repository.go`** – ListAll, GetByID, CountPublicDocumentsByCategory
- **`internal/storage/article_feedback_repository.go`** – Create feedback
- **`internal/storage/document_repository.go`** – เพิ่ม SearchPublic, ListPublic, ListPublicByCategory, GetPublicByID, ListPublicTitles, ListPublicRelated

### 3. Services
- **`internal/services/category_service.go`** – ListCategories, GetCategoryByID, ListArticlesByCategory
- **`internal/services/public_article_service.go`** – GetArticleByID, GetTOC, GetRelated, SubmitFeedback, ListPopular, ListRecommended
- **`internal/services/search_service.go`** – เพิ่ม SearchPublic, GetPopularSearches, GetSuggest, ChatAsk

### 4. Handlers (Public)
- **`internal/api/categories_handler.go`** – List, GetByID, ListArticles
- **`internal/api/articles_public_handler.go`** – GetArticle, GetTOC, GetRelated, PostFeedback, ListPopular, ListRecommended
- **`internal/api/search_handler.go`** – เพิ่ม SearchPublic, GetPopularSearches, GetSuggest
- **`internal/api/chat_handler.go`** – Ask (POST /api/chat/ask)
- **`internal/api/system_handler.go`** – Status (GET /api/system/status)

### 5. Routes
- **`internal/router/routes.go`** – ลงทะเบียน Public API ทั้งหมด (ไม่มี AuthMiddleware)

---

## Endpoints ตาม SRS

| หน้า / กลุ่ม | Method | Endpoint | หมายเหตุ |
|--------------|--------|----------|----------|
| Home | POST | `/api/search` | body: `{"query":"..."}` → `{ results: [{ id, title, snippet, category, path, score }] }` |
| Home | GET | `/api/search/popular` | คืนคำค้นยอดนิยม (ตอนนี้ค่าตายตัว) |
| Home | GET | `/api/categories` | คืน categories พร้อม articleCount |
| Home | GET | `/api/articles/popular` | บทความยอดนิยม (เรียงตาม updated_at) |
| Home | GET | `/api/articles/recommended` | บทความแนะนำ (เหมือน popular) |
| Search | GET | `/api/search/suggest?q=keyword` | แนะนำจาก title เอกสาร public |
| Category | GET | `/api/categories/:categoryId` | รายละเอียดหมวด |
| Category | GET | `/api/categories/:categoryId/articles?sort=latest|popular|az&limit=10&offset=0` | บทความในหมวด |
| Article | GET | `/api/articles/:articleId` | เนื้อหาบทความ (id, title, content, tags, lastUpdated) |
| Article | GET | `/api/articles/:articleId/toc` | Table of Contents จาก heading ใน content |
| Article | GET | `/api/articles/:articleId/related` | บทความที่เกี่ยวข้อง (หมวดเดียวกัน) |
| Article | POST | `/api/articles/:articleId/feedback` | body: `{"helpful": true}` |
| Chatbot | POST | `/api/chat/ask` | body: `{"question":"..."}` → `{ answer, sources: [{ articleId, title }] }` |
| System | GET | `/api/system/status` | `{ status: "ok" }` |

---

## หมายเหตุ

- **Article** = Document ที่ `is_public = true` (ใช้ ID เดียวกัน)
- **Category** – ต้องมีข้อมูลในตาราง `categories` และใส่ `category_id` ใน document ที่ต้องการ
- **Tags** – เก็บใน `documents.tags` (comma-separated หรือ JSON array string)
- **Popular searches** – ตอนนี้เป็นค่าตายตัว ในอนาคตอาจดึงจาก log/analytics
- **Chat** – ใช้ SearchWithContext (ChromaDB + Ollama) แล้ว map ผลค้นหาเป็น sources

ยังไม่มีการเชื่อมกับ Frontend – พร้อมให้ Frontend เรียกใช้เมื่อต้องการ
