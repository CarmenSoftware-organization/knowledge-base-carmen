# ใช้ Make แทน OpenClaw สำหรับแยกประเภทคำถาม

เมื่อตั้ง `USE_MAKE_FOR_ROUTER=true` และ `MAKE_WEBHOOK_URL=<url>` backend จะส่งคำถาม + รายการเอกสารไปที่ Make แทน OpenClaw และคาดหวัง JSON คืนกลับในรูปแบบเดียวกัน

---

## 1. ใน Make: สิ่งที่ต้องลาก/ต่อ

### โมดูลที่ต้องมีใน Scenario

1. **Webhooks → Custom webhook**
   - เลือก **Custom webhook** (แบบที่รองรับการตอบกลับ — "Respond to a webhook" / Request–Response)
   - **Create a webhook** แล้วตั้งค่า:
     - **Webhook name:** ตั้งชื่อให้รู้ว่าใช้ทำอะไร เช่น `Carmen Question Router`
     - **API Key authentication (ถ้าต้องการ):** กด "+ Add API key" สร้าง key แล้วเก็บไว้ — ใน backend ใส่ที่ `MAKE_WEBHOOK_API_KEY` และส่งใน header `x-make-apikey` อัตโนมัติ
   - กด **Save** แล้ว copy **Webhook URL** ไปใส่ใน backend เป็น `MAKE_WEBHOOK_URL`

2. **รับข้อมูลจาก Webhook**
   - Body ที่ backend ส่งมาเป็น JSON:
     - `question` (string): คำถามจากผู้ใช้
     - `documents` (array): แต่ละตัวมี `path`, `title` (path และชื่อเอกสารจาก wiki)

3. **ประมวลผล (เลือก 1 ทาง)**
   - **ทาง A:** ใช้โมดูล **OpenAI** ใน Make — สร้าง prompt จาก `question` + `documents` แล้วขอให้ตอบเป็น JSON ตามรูปแบบด้านล่าง
   - **ทาง B (แนะนำถ้าใช้ Ollama บน VM):** ใช้โมดูล **HTTP** เรียก Ollama โดยตรง — ดูรายละเอียดในหัวข้อ **"ใช้ Ollama (บน VM)"** ด้านล่าง

4. **Respond to Webhook**
   - โมดูลสุดท้ายต้อง **Respond to Webhook** (ตอบกลับไปที่ request เดิม)
   - Body ที่ต้องส่งกลับเป็น JSON รูปแบบนี้เท่านั้น:

```json
{
  "is_ambiguous": true,
  "candidates": [
    { "path": "carmen_cloud/xxx.md", "reason": "...", "score": 0.9 }
  ]
}
```

- `is_ambiguous`: ถ้ามีหลาย path ที่เกี่ยวข้องให้ `true`, ถ้าชัดเจนหนึ่ง path ให้ `false`
- `candidates`: array ของ path ที่เกี่ยวข้อง (มัก 1–3 ตัว) แต่ละตัวมี `path`, `reason` (optional), `score` (optional)

---

## 2. ในโค้ด (backend) ที่เปลี่ยนไปแล้ว

- **Config** (`internal/config/config.go`): มี `MakeConfig` แล้ว — อ่าน `MAKE_WEBHOOK_URL`, `USE_MAKE_FOR_ROUTER`
- **Client** (`pkg/make/client.go`): POST ไปที่ webhook ด้วย `{ "question", "documents" }`, อ่าน response เป็น `{ "is_ambiguous", "candidates" }`
- **Service** (`internal/services/question_router_service.go`): ถ้า `UseForQuestionRouter == true` และมี `WebhookURL` จะเรียก Make แทน OpenClaw; ผลลัพธ์ยังเป็น `QuestionRouterResult` เหมือนเดิม ดังนั้น chat handler / frontend ไม่ต้องแก้

---

## 3. สรุปการตั้งค่า

| ที่ตั้งค่า | ค่า |
|-----------|-----|
| Backend `.env` | `USE_MAKE_FOR_ROUTER=true` |
| Backend `.env` | `MAKE_WEBHOOK_URL=https://hook.eu1.make.com/...` (URL จาก Make หลัง Save webhook) |
| Backend `.env` (ถ้าเปิด API Key ใน Make) | `MAKE_WEBHOOK_API_KEY=<key ที่สร้างใน Make>` |

หลังจากนั้นเมื่อมีคำถามเข้ามา backend จะส่งไปที่ Make และใช้ผลจาก Make เป็นตัวเลือก path สำหรับถามย้ำหรืออ่าน wiki ต่อเหมือนเดิม

---

## 4. ใช้ Ollama (บน VM) แทน OpenAI

ถ้าใช้ Ollama ที่หัวหน้าตั้งไว้บน VM (ฟรี) ให้ใช้โมดูล **HTTP** ใน Make เรียก API ของ Ollama โดยไม่ต้องใช้ OpenAI

**เงื่อนไข:** Make รันบน cloud — ต้องเรียก Ollama ผ่าน URL ที่เข้าถึงจากอินเทอร์เน็ตได้ (เช่น `https://ollama.semapru.com`) ถ้า VM มีแค่ localhost จะต้องมี reverse proxy หรือ tunnel ให้เป็น public URL ก่อน

### ขั้นตอนใน Make (หลัง Webhook)

1. **ต่อด้วยโมดูล Tools → Compose a string** (หรือ Set variable)  
   - ใช้สร้างข้อความ prompt จาก output ของ Webhook:
     - `question` = `{{1.question}}`
     - รายการเอกสาร: ใช้ **Array aggregator** ต่อจาก Webhook เพื่อรวม `documents` เป็นข้อความแบบ "path - title" ทีละบรรทัด แล้วเอามาใส่ใน prompt
   - ข้อความ prompt ตัวอย่าง (**สำคัญ:** อ่านกฎ is_ambiguous ด้านล่าง):
   ```
   จากคำถามและรายการเอกสารด้านล่าง ให้เลือก path ที่เกี่ยวข้อง ตอบเฉพาะ JSON เท่านั้น ไม่มีข้อความอื่น รูปแบบ:
   {"is_ambiguous": true หรือ false, "candidates": [{"path": "path/ไฟล์.md", "reason": "เหตุผลสั้นๆ", "score": 0.9}]}

   กฎการตั้ง is_ambiguous และจำนวน candidates:
   - ถ้าคำถามชัดว่าหมายถึงเรื่องเดียว / เอกสารเดียว → is_ambiguous: false และ candidates มีแค่ 1 ตัว (path ที่ตรงที่สุด)
   - ถ้าคำถามกำกวม หรือถามหลายหัวข้อ (เช่น "อยากรู้เรื่อง A และ B") → is_ambiguous: true และ candidates มี 2–3 ตัว (ให้ user เลือกในระบบได้)

   คำถาม: {{1.question}}

   รายการเอกสาร (path - title):
   {{ผลจาก Array aggregator}}
   ```

2. **ต่อด้วยโมดูล HTTP**
   - **URL:** `https://ollama.semapru.com/api/chat` (ใช้ URL ของ VM จริงที่เข้าถึงจากนอกได้)
   - **Method:** POST  
   - **Headers:** `Content-Type` = `application/json`
   - **Request body (JSON):**
   ```json
   {
     "model": "gemma3:1b",
     "messages": [
       { "role": "user", "content": "{{ผลจาก Compose a string}}" }
     ],
     "stream": false
   }
   ```
   - (ถ้า VM ใช้ model อื่น ให้เปลี่ยน `model` ตามที่หัวหน้าตั้งไว้ เช่น `llama2`)

3. **ต่อด้วย Tools → Parse JSON** (ถ้าต้องการ)
   - Ollama จะคืนฟิลด์ `message.content` เป็น string ที่เป็น JSON
   - ใส่ `{{2.message.content}}` (หมายเลขโมดูลตามของจริง) แล้ว Parse เป็น object

4. **ต่อด้วย Webhooks → Respond to Webhook**
   - **Body:** ส่ง object ที่ได้จาก Parse JSON (ต้องมี `is_ambiguous` และ `candidates`)  
   - หรือถ้าไม่ใช้ Parse JSON ให้ส่งโดยตรงจาก `{{2.message.content}}` เป็น raw string ที่เป็น JSON ก็ได้ — backend รับได้ทั้ง object และ string ที่เป็น JSON

### สรุปค่าที่ใช้ (ให้ตรงกับ VM)

| ค่า | ตัวอย่าง | หมายเหตุ |
|-----|----------|----------|
| Ollama URL | `https://ollama.semapru.com` | ต้องเข้าถึงจาก Make (อินเทอร์เน็ต) ได้ |
| Model | `gemma3:1b` | ใช้ตามที่หัวหน้าตั้งใน VM (ดูจาก backend `.env` ได้) |
