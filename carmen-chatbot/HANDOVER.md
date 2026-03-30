# 🤝 Handover Document: Carmen Chatbot

## 📌 Project Overview
Carmen Chatbot ปัจจุบันถูกออกแบบด้วยสถาปัตยกรรม **Advanced RAG Pipeline แบบเส้นตรง (Straight-Through Pipeline)** โดยทำงานผ่าน **Pure Python Orchestration** เป็นเอกลักษณ์สำคัญ 
โปรเจกต์นี้ตั้งใจหลีกเลี่ยงการใช้ Framework ครอบจักรวาลอย่าง LangChain (LCEL) หรือ LangGraph ในการคุม Flow ทั้งหมด เพื่อให้สามารถ:
1. **คุม Streaming ได้ละเอียด:** สามารถดักจับโครงสร้างแปลกๆ เช่น แท็ก `[SUGGESTIONS]` ระหว่างที่ Stream ได้แบบเจาะจง
2. **คุม Performance และ Token Logging:** สามารถนับและบันทึก Token ทุกลำดับขั้น (Intent detection -> Query Rewrite -> Vector Search -> Chat Generation) ลง Database ได้อย่างแม่นยำ
3. **ความเร็วและความเสถียร:** ทำงานและรันเงื่อนไข Fallback ได้เร็วกว่า โดยไม่ต้องพะวงกับการพังของอัปเดตไลบรารีภายนอก 

---

## 🔮 The Future Vision: ก้าวต่อไปสู่ "Action-Oriented AI Agent"

สถานะปัจจุบัน AI ของเราเป็นเสมือน **"บรรณารักษ์ผู้รอบรู้"** ที่สามารถอ่านหนังสือจากคู่มือ (Vector DB) และมาอธิบายตอบคำถามให้ลูกค้าได้อย่างยอดเยี่ยม 
ก้าวต่อไปที่สำคัญที่สุดของโปรเจกต์นี้คือการ **"ติดแขนติดขา (Arms and Legs)"** ให้กับ AI เพื่อให้สามารถช่วยเหลือและ "ลงมือทำ" (Take action) แทนลูกค้าได้จริง (Customer Service & Support Agentic Workflow)

### 🛣️ Roadmap สู่การเป็น Agentic System

ทีมที่จะมารับช่วงต่อ ไม่จำเป็นต้องโละระบบเก่าทิ้ง! ระบบโครงสร้าง RAG และ Intent Routing เดิมคือรากฐาน (Foundation) ที่แข็งแกร่งมาก สิ่งที่ต้องทำคือการต่อยอดจากโครงร่างเดิม ดังนี้:

#### 1. การสร้าง Tools (Functions) 🛠️
เขียน Python ฟังก์ชันปกติเพื่อเชื่อมต่อกับระบบหลังบ้าน (API อื่นๆ ภายในบริษัท) เช่น:
- `check_ticket_status(ticket_id)`
- `reset_user_password(user_email)`
- `fetch_order_status(order_no)`

#### 2. ผสาน Function Calling คุยกับ LLM 📞
ในโค้ด `llm_client.py` เมื่อเตรียม Tools เสร็จแล้ว สามารถส่ง Schema ของ Tools เหล่านี้แนบไปในตัวแปร `tools` ในฝั่งของ OpenRouter/OpenAI 
วิธีนี้จะสอนให้ AI รู้ว่ามันไม่ต้องหาคำตอบด้วย RAG เสมอไป แต่มันสามารถ "ขอสิทธิ์เรียกใช้ฟังก์ชัน" เพื่อดึงข้อมูลสดๆ ได้

#### 3. ปรับ Orchestration เป็น Agentic Loop (While Loop) 🔄
จากไฟล์ `chat_service.py` เดิมที่ทำหน้าแบบ 1-Pass (ค้นหา -> ส่ง LLM -> ตอบลูกค้าจบ) 
จะต้องครอบ Core Logic ด้วย **While Loop** เพื่อให้เกิดการตัดสินใจแบบ ReAct (Reason -> Act):
1. LLM ตัดสินใจว่าต้องใช้ Tool 
2. โค้ดเรารับคำสั่งมารันฟังก์ชัน
3. โค้ดส่งผลลัพธ์ยัดเข้า `chat_history` และวนลูปดึง LLM อีกครั้ง
4. ทำซ้ำจน LLM ได้ข้อมูลเพียงพอและตอบเป็นประโยคข้อความปกติ

#### 4. เพิ่มระบบความปลอดภัย (Security & Human-in-the-Loop) 🔐
เนื่องจาก AI จะสามารถจัดการ Action สำคัญได้ ระบบ Context ของ `room_id` และ User Session จะต้องถูกผูกให้แน่นหนาขึ้น 
สำหรับคำสั่งที่มีความเสี่ยงสูง (High-Risk Actions) เช่น การลบบัญชี AI ควรเชื่อมโยง UI โดยตีกลับปุ่ม "Confirmation" ให้มนุษย์ (ลูกค้า) กดคอนเฟิร์มก่อนรันฟังก์ชันหลังบ้านจริงเสมอ

---

## 📌 สรุปทิ้งท้าย

โครงสร้างนี้ถูกปูทางไว้พร้อมสำหรับการ Scale เป็น Agent แล้ว ขอให้ทีมงานที่รับช่วงต่อยึดมั่นในสถาปัตยกรรม **Pure Python / Native API Calling** ไว้ให้มากที่สุด เพราะความเรียบง่ายนี้แหล่ะที่ทำให้ระบบสเกลได้ง่ายและบำรุงรักษาได้เจ็บตัวน้อยที่สุด

ขอให้โชคดีและสนุกกับการพัฒนา Carmen Chatbot นะครับ! 🚀
